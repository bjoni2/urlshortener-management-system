import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateShortUrlRequest,
  PageResponse,
  ShortUrlResponse,
  UpdateShortUrlRequest,
  UrlQuery,
  UrlStats,
} from '../models/api.models';

export function toHttpParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ShortUrlService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/urls`;

  list(query: UrlQuery): Observable<PageResponse<ShortUrlResponse>> {
    return this.http.get<PageResponse<ShortUrlResponse>>(this.baseUrl, {
      params: toHttpParams({ ...query }),
    });
  }

  get(id: string): Observable<ShortUrlResponse> {
    return this.http.get<ShortUrlResponse>(`${this.baseUrl}/${id}`);
  }

  stats(): Observable<UrlStats> {
    return this.http.get<UrlStats>(`${this.baseUrl}/stats`);
  }

  create(request: CreateShortUrlRequest): Observable<ShortUrlResponse> {
    return this.http.post<ShortUrlResponse>(this.baseUrl, request);
  }

  update(id: string, request: UpdateShortUrlRequest): Observable<ShortUrlResponse> {
    return this.http.put<ShortUrlResponse>(`${this.baseUrl}/${id}`, request);
  }

  setActive(id: string, active: boolean): Observable<ShortUrlResponse> {
    const action = active ? 'activate' : 'deactivate';
    return this.http.patch<ShortUrlResponse>(`${this.baseUrl}/${id}/${action}`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
