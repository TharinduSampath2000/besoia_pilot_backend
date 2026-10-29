import { findOption, questions } from '../config/questions.js';
import { icebreakers } from '../config/icebreakers.js';

export function calculateCompatibility(firstAnswers, secondAnswers) {
  const questionIds = Object.keys(firstAnswers);
  if (questionIds.length !== 7) return 0;
  const matches = questionIds.filter((questionId) => firstAnswers[questionId] === secondAnswers[questionId]).length;
  return Math.round((matches / 7) * 100);
}

export function findSharedAnswers(firstAnswers, secondAnswers) {
  return questions
    .filter((question) => firstAnswers[question.id] && firstAnswers[question.id] === secondAnswers[question.id])
    .map((question) => ({ questionId: question.id, optionId: firstAnswers[question.id] }));
}

const text = (entry, fallback) => (entry ? { en: entry.en, es: entry.es } : { en: fallback, es: fallback });

// stored ids -> { en, es } text for the client
export function describeSharedAnswers(sharedAnswers) {
  return sharedAnswers.map(({ questionId, optionId }) => {
    const question = questions.find((item) => item.id === questionId);
    return { questionId, question: text(question?.question, ''), answer: text(findOption(questionId, optionId), optionId) };
  });
}

export function describeIcebreaker(id) {
  return text(icebreakers.find((item) => item.id === id), id);
}
