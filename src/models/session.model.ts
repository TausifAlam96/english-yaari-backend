import { Schema, Types, model, type HydratedDocument, type Model } from 'mongoose';

export const SESSION_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BOOKED: 'BOOKED',
  COMPLETED: 'COMPLETED',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export interface ISession {
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<ISession>;

const sessionSchema = new Schema<ISession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'teacherId is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
      validate: {
        validator(this: ISession, value: Date): boolean {
          // `this` is the document on save, or the query cast on updates.
          return !this.startTime || value.getTime() > this.startTime.getTime();
        },
        message: 'endTime must be greater than startTime',
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SESSION_STATUS),
        message: 'status must be one of AVAILABLE, BOOKED, COMPLETED',
      },
      default: SESSION_STATUS.AVAILABLE,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
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

// Supports the "available sessions for a date" query.
sessionSchema.index({ status: 1, startTime: 1 });
// Supports the "user session history" query.
sessionSchema.index({ userId: 1, status: 1, startTime: 1 });

export const Session: Model<ISession> = model<ISession>('Session', sessionSchema);
