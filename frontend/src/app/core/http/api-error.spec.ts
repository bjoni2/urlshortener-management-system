import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage, fieldErrors } from './api-error';

function problemResponse(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/v1/urls' });
}

describe('errorMessage', () => {
  it('uses the detail sentence from a problem document', () => {
    const error = problemResponse(409, { title: 'Conflict', detail: "The alias 'my-link' is already in use." });

    expect(errorMessage(error)).toBe("The alias 'my-link' is already in use.");
  });

  it('lists every field message when validation failed, not just the summary', () => {
    const error = problemResponse(400, {
      title: 'Validation failed',
      detail: 'One or more fields are invalid.',
      errors: { email: 'Email is required', password: 'Password is too short' },
    });

    expect(errorMessage(error)).toBe('Email is required Password is too short');
  });

  it('explains an unreachable server in terms a user can act on', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot reach the server');
  });

  it('falls back to the title when a problem document carries no detail', () => {
    expect(errorMessage(problemResponse(500, { title: 'Internal server error' }))).toBe('Internal server error');
  });

  it('accepts a plain string body', () => {
    expect(errorMessage(problemResponse(400, 'Something specific went wrong'))).toBe(
      'Something specific went wrong',
    );
  });

  it('never surfaces a raw framework message', () => {
    const fallback = 'Something went wrong. Please try again.';

    expect(errorMessage(problemResponse(500, null))).toBe(fallback);
    expect(errorMessage(problemResponse(400, {}))).toBe(fallback);
    expect(errorMessage(new Error('boom'))).toBe(fallback);
    expect(errorMessage(undefined)).toBe(fallback);
  });

  it('honours a caller-supplied fallback', () => {
    expect(errorMessage(new Error('boom'), 'Could not sign in.')).toBe('Could not sign in.');
  });
});

describe('fieldErrors', () => {
  it('extracts the per-field map so a form can bind server-side validation', () => {
    const error = problemResponse(400, { errors: { originalUrl: 'URL must start with http://' } });

    expect(fieldErrors(error)).toEqual({ originalUrl: 'URL must start with http://' });
  });

  it('returns nothing when the failure is not a validation failure', () => {
    expect(fieldErrors(problemResponse(404, { detail: 'Not found' }))).toEqual({});
    expect(fieldErrors(new Error('boom'))).toEqual({});
  });
});
