export class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function assert(condition, code, message, status = 400, details = undefined) {
  if (!condition) throw new AppError(code, message, status, details);
}

export function errorPayload(error) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    };
  }
  console.error('[ERROR]', error?.stack || error);
  return {
    status: 500,
    body: { error: 'INTERNAL_ERROR', message: 'O servidor encontrou um erro inesperado.' },
  };
}

