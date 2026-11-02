import { Router } from 'express';
import { createUser, getUserSessions, listUsers } from '../controllers/user.controller';

const router = Router();

router.post('/', createUser);
router.get('/', listUsers);
router.get('/:id/sessions', getUserSessions);

export default router;
