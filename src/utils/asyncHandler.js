// Express 4 does not forward rejected promises to the error handler, so async
// controllers must be wrapped or a thrown error leaves the request hanging.
export const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};
