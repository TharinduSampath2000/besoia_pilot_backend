import { Router } from 'express';
import { listQuestions, saveAnswers } from '../controllers/quizController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/questions', listQuestions);
router.post('/answers', asyncHandler(saveAnswers));
export default router;
