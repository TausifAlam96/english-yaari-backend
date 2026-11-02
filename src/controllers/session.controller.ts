import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Session, SESSION_STATUS } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { getDayRange } from '../utils/date';
import { assert, optionalNumber, requireDate, requireObjectId } from '../utils/validate';

const TEACHER_POPULATE = {
  path: 'teacherId',
  select: 'fullName email specialization experience',
} as const;

/** POST /sessions - create an AVAILABLE session for an existing teacher. */
export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = requireObjectId(req.body?.teacherId, 'teacherId');
  const startTime = requireDate(req.body?.startTime, 'startTime');
  const endTime = requireDate(req.body?.endTime, 'endTime');

  assert(
    endTime.getTime() > startTime.getTime(),
    'endTime must be greater than startTime',
  );

  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) {
    throw AppError.notFound('Teacher not found');
  }

  const session = await Session.create({
    teacherId,
    userId: null,
    startTime,
    endTime,
    status: SESSION_STATUS.AVAILABLE,
    completedAt: null,
  });

  res.status(201).json({
    success: true,
    message: 'Session created successfully',
    data: session.toJSON(),
  });
});

interface AvailableSession {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: string;
  teacher: {
    _id?: Types.ObjectId;
    fullName?: string;
    email?: string;
    specialization?: string;
    experience?: number;
  } | null;
}

/**
 * GET /sessions/available?dateTimestamp={timestamp}
 * Mandatory aggregation pipeline implementation.
 */
export const getAvailableSessions = asyncHandler(async (req: Request, res: Response) => {
  const dateTimestamp = optionalNumber(req.query.dateTimestamp, 'dateTimestamp');
  assert(dateTimestamp !== undefined, 'dateTimestamp query parameter is required');
  assert(dateTimestamp > 0, 'dateTimestamp must be a positive timestamp');

  const { start, end } = getDayRange(dateTimestamp);

  const sessions = await Session.aggregate<AvailableSession>([
    {
      $match: {
        status: SESSION_STATUS.AVAILABLE,
        startTime: { $gte: start, $lt: end },
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
    { $sort: { startTime: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      date: start.toISOString(),
      total: sessions.length,
      sessions,
    },
  });
});

/**
 * POST /sessions/:id/book
 * Books an AVAILABLE session. The final write is a conditional update on
 * `status: AVAILABLE` so two concurrent requests cannot both win.
 */
export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = requireObjectId(req.params.id, 'id');
  const userId = requireObjectId(req.body?.userId, 'userId');

  const user = await User.findById(userId).lean();
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const session = await Session.findById(sessionId).select('status').lean();
  if (!session) {
    throw AppError.notFound('Session not found');
  }

  if (session.status === SESSION_STATUS.BOOKED) {
    throw AppError.conflict('Session is already booked and cannot be booked again');
  }
  if (session.status === SESSION_STATUS.COMPLETED) {
    throw AppError.conflict('Completed sessions cannot be booked');
  }

  const bookedSession = await Session.findOneAndUpdate(
    { _id: sessionId, status: SESSION_STATUS.AVAILABLE },
    { $set: { status: SESSION_STATUS.BOOKED, userId } },
    { new: true, runValidators: true },
  )
    .populate(TEACHER_POPULATE)
    .lean();

  if (!bookedSession) {
    throw AppError.conflict('Session is no longer available for booking');
  }

  res.status(200).json({
    success: true,
    message: 'Session booked successfully',
    data: bookedSession,
  });
});

/**
 * PATCH /sessions/:id/complete
 * Marks a BOOKED session as COMPLETED and records completedAt.
 */
export const completeSession = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = requireObjectId(req.params.id, 'id');

  const session = await Session.findById(sessionId).select('status').lean();
  if (!session) {
    throw AppError.notFound('Session not found');
  }

  if (session.status === SESSION_STATUS.AVAILABLE) {
    throw AppError.conflict('Only booked sessions can be marked as completed');
  }
  if (session.status === SESSION_STATUS.COMPLETED) {
    throw AppError.conflict('Session is already completed');
  }

  const completedSession = await Session.findOneAndUpdate(
    { _id: sessionId, status: SESSION_STATUS.BOOKED },
    { $set: { status: SESSION_STATUS.COMPLETED, completedAt: new Date() } },
    { new: true, runValidators: true },
  )
    .populate(TEACHER_POPULATE)
    .lean();

  if (!completedSession) {
    throw AppError.conflict('Session could not be completed because its status changed');
  }

  res.status(200).json({
    success: true,
    message: 'Session marked as completed',
    data: completedSession,
  });
});
