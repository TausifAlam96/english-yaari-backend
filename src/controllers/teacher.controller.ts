import type { Request, Response } from 'express';
import { Teacher } from '../models/teacher.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { assert, optionalNumber, requireEmail, requireString } from '../utils/validate';

/**
 * POST /teachers
 * Supporting endpoint (not numbered in the assignment) so sessions can be
 * created for a real teacher during testing.
 */
export const createTeacher = asyncHandler(async (req: Request, res: Response) => {
  const fullName = requireString(req.body?.fullName, 'fullName');
  const email = requireEmail(req.body?.email);
  const specialization = requireString(req.body?.specialization, 'specialization');
  const experience = optionalNumber(req.body?.experience, 'experience', 0);

  assert(experience !== undefined, 'experience is required');

  const teacher = await Teacher.create({ fullName, email, specialization, experience });

  res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    data: teacher.toJSON(),
  });
});

/** GET /teachers - supporting endpoint used to discover teacherIds. */
export const listTeachers = asyncHandler(async (_req: Request, res: Response) => {
  const teachers = await Teacher.find().sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, data: teachers });
});
