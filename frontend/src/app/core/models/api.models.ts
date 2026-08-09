
export type Role = 'USER' | 'ADMIN';

export type UrlStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface UserResponse {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly enabled: boolean;
  readonly createdAt: string;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly user: UserResponse;
}

export interface ShortUrlResponse {
  readonly id: string;
  readonly shortCode: string;
  readonly shortUrl: string;
  readonly originalUrl: string;
  readonly status: UrlStatus;
  readonly expiresAt: string | null;
  readonly clickCount: number;
  readonly lastAccessedAt: string | null;
  readonly customAlias: boolean;
  readonly ownerEmail: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UrlStats {
  readonly totalUrls: number;
  readonly activeUrls: number;
  readonly inactiveUrls: number;
  readonly expiredUrls: number;
  readonly totalClicks: number;
}

export interface PageResponse<T> {
  readonly content: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

export interface CreateShortUrlRequest {
  readonly originalUrl: string;
  readonly customAlias?: string | null;
  readonly expiresAt?: string | null;
}

export interface UpdateShortUrlRequest {
  readonly expiresAt: string | null;
  readonly active: boolean;
}

export interface UrlQuery {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly search?: string;
  readonly status?: UrlStatus | '';
  readonly ownerEmail?: string;
}

export interface UserQuery {
  readonly page: number;
  readonly size: number;
  readonly sort: string;
  readonly search?: string;
  readonly role?: Role | '';
  readonly enabled?: boolean | null;
}

export interface ProblemDetail {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: Record<string, string>;
}
