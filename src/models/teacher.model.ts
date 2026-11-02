import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface ITeacher {
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TeacherDocument = HydratedDocument<ITeacher>;

const teacherSchema = new Schema<ITeacher>(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
      maxlength: [120, 'fullName cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'],
    },
    specialization: {
      type: String,
      required: [true, 'specialization is required'],
      trim: true,
      maxlength: [120, 'specialization cannot exceed 120 characters'],
    },
    experience: {
      type: Number,
      required: [true, 'experience is required'],
      min: [0, 'experience cannot be negative'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

teacherSchema.index({ email: 1 });
teacherSchema.index({ specialization: 1 });

export const Teacher: Model<ITeacher> = model<ITeacher>('Teacher', teacherSchema);
