import { Router } from 'express';
import { createMatch, getQrToken, getRecentMatches } from '../controllers/matchController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/qr-token', getQrToken);
router.post('/scan', asyncHandler(createMatch));
router.get('/recent', asyncHandler(getRecentMatches));
export default router;
