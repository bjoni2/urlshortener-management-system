import { TestBed } from '@angular/core/testing';
import { TokenStorage } from './token-storage';

describe('TokenStorage', () => {
  let storage: TokenStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(TokenStorage);
  });

  afterEach(() => localStorage.clear());

  it('round-trips a token pair', () => {
    storage.write({ accessToken: 'a', refreshToken: 'r' });

    expect(storage.read()).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('reports nothing stored before a first sign-in', () => {
    expect(storage.read()).toBeNull();
  });

  it('forgets the session on clear', () => {
    storage.write({ accessToken: 'a', refreshToken: 'r' });

    storage.clear();

    expect(storage.read()).toBeNull();
  });

  it('treats corrupt storage as no session rather than crashing the app on load', () => {
    localStorage.setItem('urlshortener.tokens', 'not json at all');

    expect(storage.read()).toBeNull();
  });

  it('rejects a partial pair, which could not authenticate anything anyway', () => {
    localStorage.setItem('urlshortener.tokens', JSON.stringify({ accessToken: 'a' }));

    expect(storage.read()).toBeNull();
  });
});
