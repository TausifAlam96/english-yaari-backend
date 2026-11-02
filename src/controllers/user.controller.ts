import type { Request, Response } from 'express';
import { Session, SESSION_STATUS } from '../models/session.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { optionalString, requireEmail, requireObjectId, requireString } from '../utils/validate';
import { Types } from 'mongoose';

/** POST /users - create a user with a unique email. */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const fullName = requireString(req.body?.fullName, 'fullName');
  const email = requireEmail(req.body?.email);
  const phone = optionalString(req.body?.phone, 'phone');

  const existingUser = await User.exists({ email });
  if (existingUser) {
    throw AppError.conflict('A user with this email already exists');
  }

  const user = await User.create({ fullName, email, phone });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user.toJSON(),
  });
});

/** POST /users? Not part of the assignment; used for quick lookups in Postman. */
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, data: users });
});

interface SessionWithTeacher {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: string;
  completedAt: Date | null;
  teacher: {
    _id?: Types.ObjectId;
    fullName?: string;
    email?: string;
    specialization?: string;
    experience?: number;
  };
}

interface UserSessionsAggregation {
  upcomingSessions: SessionWithTeacher[];
  completedSessions: SessionWithTeacher[];
}

/**
 * GET /users/:id/sessions
 * Returns the user's sessions split into upcoming (BOOKED) and completed,
 * built entirely with an aggregation pipeline ($match, $lookup, $facet).
 */
export const getUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireObjectId(req.params.id, 'id');

  const user = await User.findById(userId).select('fullName email phone createdAt updatedAt').lean();
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const [result] = await Session.aggregate<UserSessionsAggregation>([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        status: { $in: [SESSION_STATUS.BOOKED, SESSION_STATUS.COMPLETED] },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        teacher: {
          _id: '$teacher._id',
          fullName: '$teacher.fullName',
          email: '$teacher.email',
          specialization: '$teacher.specialization',
          experience: '$teacher.experience',
        },
      },
    },
    { $project: { __v: 0 } },
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: SESSION_STATUS.BOOKED } },
          { $sort: { startTime: 1 } },
        ],
        completedSessions: [
          { $match: { status: SESSION_STATUS.COMPLETED } },
          { $sort: { completedAt: -1 } },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        upcomingSessions: { $ifNull: ['$upcomingSessions', []] },
        completedSessions: { $ifNull: ['$completedSessions', []] },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      user,
      upcomingSessions: result?.upcomingSessions ?? [],
      completedSessions: result?.completedSessions ?? [],
    },
  });
});
