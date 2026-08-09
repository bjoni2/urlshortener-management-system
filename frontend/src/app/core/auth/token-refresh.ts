import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TokenRefresher {
  private readonly auth = inject(AuthService);
  private inFlight: Observable<string> | null = null;

  refresh(): Observable<string> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const request = this.auth.refreshSession().pipe(
      map((response) => response.accessToken),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.inFlight = request;

    const release = () => {
      if (this.inFlight === request) {
        this.inFlight = null;
      }
    };
    request.subscribe({ next: release, error: release });

    return request;
  }
}
