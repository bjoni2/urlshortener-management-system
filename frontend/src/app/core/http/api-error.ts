import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/api.models';

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check that the backend is running.';
  }

  const problem = error.error as ProblemDetail | string | null;
  if (typeof problem === 'string' && problem.trim()) {
    return problem;
  }
  if (problem && typeof problem === 'object') {
    const fieldErrors = problem.errors ? Object.values(problem.errors) : [];
    if (fieldErrors.length) {
      return fieldErrors.join(' ');
    }
    if (problem.detail) {
      return problem.detail;
    }
    if (problem.title) {
      return problem.title;
    }
  }
  return fallback;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return (error.error as ProblemDetail).errors ?? {};
  }
  return {};
}
