import { Injectable } from '@angular/core';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private static readonly KEY = 'urlshortener.tokens';

  read(): StoredTokens | null {
    try {
      const raw = localStorage.getItem(TokenStorage.KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<StoredTokens>;
      return parsed.accessToken && parsed.refreshToken
        ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
        : null;
    } catch {
      return null;
    }
  }

  write(tokens: StoredTokens): void {
    try {
      localStorage.setItem(TokenStorage.KEY, JSON.stringify(tokens));
    } catch {
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(TokenStorage.KEY);
    } catch {
    }
  }
}
