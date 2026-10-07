import { Router } from 'express';
import { createMatch, getPendingMatch } from '../controllers/matchController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/scan', asyncHandler(createMatch));
router.get('/pending', asyncHandler(getPendingMatch));
export default router;
