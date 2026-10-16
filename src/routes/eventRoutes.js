import { Router } from 'express';
import { logEvent } from '../controllers/eventController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/', asyncHandler(logEvent));
export default router;
