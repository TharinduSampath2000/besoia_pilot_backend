import { questions } from '../config/questions.js';

export function calculateCompatibility(firstAnswers, secondAnswers) {
  const questionIds = Object.keys(firstAnswers);
  if (questionIds.length !== 7) return 0;
  const matches = questionIds.filter((questionId) => firstAnswers[questionId] === secondAnswers[questionId]).length;
  return Math.round((matches / 7) * 100);
}

export function findSharedAnswers(firstAnswers, secondAnswers) {
  return questions
    .filter((question) => firstAnswers[question.id] && firstAnswers[question.id] === secondAnswers[question.id])
    .map((question) => ({ questionId: question.id, question: question.question, answer: firstAnswers[question.id] }));
}
