import { Router } from 'express';
import { endSession, getSession, register } from '../controllers/userController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.get('/session', asyncHandler(getSession));
router.delete('/session', endSession);
export default router;
