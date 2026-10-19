import { Router } from 'express';
import { exportEvents, exportIndex, exportMatches, exportUsers } from '../controllers/exportController.js';
import { requireExportToken } from '../middleware/exportAuth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(requireExportToken);
router.get('/', asyncHandler(exportIndex));
router.get('/users.csv', asyncHandler(exportUsers));
router.get('/matches.csv', asyncHandler(exportMatches));
router.get('/events.csv', asyncHandler(exportEvents));
export default router;
