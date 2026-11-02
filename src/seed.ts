import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/db';
import { Session, SESSION_STATUS } from './models/session.model';
import { Teacher } from './models/teacher.model';
import { User } from './models/user.model';

/**
 * Seeds one demo teacher, one demo user and three AVAILABLE sessions for
 * tomorrow so the Postman collection can be run end to end immediately.
 *
 * Run with: npm run seed
 */
async function seed(): Promise<void> {
  await connectDatabase();

  const teacher = await Teacher.findOneAndUpdate(
    { email: 'priya.sharma@example.com' },
    {
      $setOnInsert: {
        fullName: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        specialization: 'Spoken English',
        experience: 7,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const user = await User.findOneAndUpdate(
    { email: 'rahul.verma@example.com' },
    {
      $setOnInsert: {
        fullName: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '+919876543210',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const day = new Date();
  day.setDate(day.getDate() + 1);
  day.setHours(0, 0, 0, 0);

  const slots = [10, 14, 18];
  const createdSessions: Array<{ id: Types.ObjectId; startTime: Date }> = [];

  for (const hour of slots) {
    const startTime = new Date(day);
    startTime.setHours(hour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);

    const existing = await Session.exists({
      teacherId: teacher._id,
      startTime,
    });
    if (existing) continue;

    const session = await Session.create({
      teacherId: teacher._id,
      userId: null,
      startTime,
      endTime,
      status: SESSION_STATUS.AVAILABLE,
      completedAt: null,
    });

    createdSessions.push({ id: session._id, startTime });
  }

  console.log('\nSeed complete');
  console.log('  teacherId :', teacher._id.toString());
  console.log('  userId    :', user._id.toString());
  console.log('  sessions  :', createdSessions.map((s) => s.id.toString()).join(', ') || '(already present)');
  console.log('  dateTimestamp for /sessions/available :', day.getTime());
  console.log('  session day :', day.toDateString());

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error('[seed] failed:', error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
