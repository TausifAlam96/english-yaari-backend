import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export interface IUser {
  fullName: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
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
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'email must be a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: undefined,
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

export const User: Model<IUser> = model<IUser>('User', userSchema);
