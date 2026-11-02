import { Router } from 'express';
import { createTeacher, listTeachers } from '../controllers/teacher.controller';

const router = Router();

router.post('/', createTeacher);
router.get('/', listTeachers);

export default router;
