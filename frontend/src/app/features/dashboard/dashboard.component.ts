import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ShortUrlService } from '../../core/api/short-url.service';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { ShortUrlResponse, UrlStats } from '../../core/models/api.models';
import { StatCardComponent } from '../../shared/stat-card.component';
import { UrlStatusChipComponent } from '../../shared/url-status-chip.component';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatCardComponent,
    UrlStatusChipComponent,
    RelativeTimePipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly urls = inject(ShortUrlService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<UrlStats | null>(null);
  protected readonly recent = signal<readonly ShortUrlResponse[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      stats: this.urls.stats(),
      recent: this.urls.list({ page: 0, size: 5, sort: 'createdAt,desc' }),
    }).subscribe({
      next: ({ stats, recent }) => {
        this.stats.set(stats);
        this.recent.set(recent.content);
        this.loading.set(false);
      },
      error: (cause: unknown) => {
        this.error.set(errorMessage(cause, 'Could not load your dashboard.'));
        this.loading.set(false);
      },
    });
  }
}
