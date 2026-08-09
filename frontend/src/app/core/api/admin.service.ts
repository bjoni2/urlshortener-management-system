import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse, ShortUrlResponse, UrlQuery, UrlStats, UserQuery, UserResponse } from '../models/api.models';
import { toHttpParams } from './short-url.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/admin`;

  listUsers(query: UserQuery): Observable<PageResponse<UserResponse>> {
    return this.http.get<PageResponse<UserResponse>>(`${this.baseUrl}/users`, {
      params: toHttpParams({ ...query }),
    });
  }

  setUserEnabled(id: string, enabled: boolean): Observable<UserResponse> {
    const action = enabled ? 'activate' : 'deactivate';
    return this.http.patch<UserResponse>(`${this.baseUrl}/users/${id}/${action}`, {});
  }

  listUrls(query: UrlQuery): Observable<PageResponse<ShortUrlResponse>> {
    return this.http.get<PageResponse<ShortUrlResponse>>(`${this.baseUrl}/urls`, {
      params: toHttpParams({ ...query }),
    });
  }

  stats(): Observable<UrlStats> {
    return this.http.get<UrlStats>(`${this.baseUrl}/urls/stats`);
  }

  deleteUrl(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/urls/${id}`);
  }
}
