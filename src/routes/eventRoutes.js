import { Router } from 'express';
import { exportEvents, logEvent } from '../controllers/eventController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/', asyncHandler(logEvent));
router.get('/export.csv', asyncHandler(exportEvents));
export default router;
