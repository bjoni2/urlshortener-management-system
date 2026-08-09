import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ShortUrlService } from '../../core/api/short-url.service';
import { errorMessage } from '../../core/http/api-error';
import { ShortUrlResponse, UrlStatus } from '../../core/models/api.models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';
import { UrlStatusChipComponent } from '../../shared/url-status-chip.component';
import { UrlFormDialogComponent, UrlFormDialogData } from './url-form.dialog';

@Component({
  selector: 'app-url-list',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    UrlStatusChipComponent,
    RelativeTimePipe,
  ],
  templateUrl: './url-list.component.html',
  styleUrl: './url-list.component.scss',
})
export class UrlListComponent {
  private readonly urls = inject(ShortUrlService);
  private readonly dialog = inject(MatDialog);
  private readonly clipboard = inject(Clipboard);
  private readonly notifications = inject(NotificationService);

  protected readonly displayedColumns = ['shortCode', 'originalUrl', 'status', 'clickCount', 'expiresAt', 'actions'];

  protected readonly rows = signal<readonly ShortUrlResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl<UrlStatus | ''>('', { nonNullable: true });

  private page = 0;
  private size = 10;
  private sort = 'createdAt,desc';

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload(true));

    this.status.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload(true));

    this.reload();
  }

  protected reload(resetPage = false): void {
    if (resetPage) {
      this.page = 0;
    }
    this.loading.set(true);
    this.error.set(null);

    this.urls
      .list({
        page: this.page,
        size: this.size,
        sort: this.sort,
        search: this.search.value.trim(),
        status: this.status.value,
      })
      .subscribe({
        next: (result) => {
          this.rows.set(result.content);
          this.total.set(result.totalElements);
          this.loading.set(false);
        },
        error: (cause: unknown) => {
          this.error.set(errorMessage(cause, 'Could not load your URLs.'));
          this.loading.set(false);
        },
      });
  }

  protected onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.reload();
  }

  protected get pageIndex(): number {
    return this.page;
  }

  protected get pageSize(): number {
    return this.size;
  }

  protected onSort(event: Sort): void {
    this.sort = event.direction ? `${event.active},${event.direction}` : 'createdAt,desc';
    this.reload(true);
  }

  protected create(): void {
    this.dialog
      .open<UrlFormDialogComponent, UrlFormDialogData, ShortUrlResponse>(UrlFormDialogComponent, {
        data: {},
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.notifications.success(`Created ${created.shortUrl}`);
          this.reload(true);
        }
      });
  }

  protected edit(url: ShortUrlResponse): void {
    this.dialog
      .open<UrlFormDialogComponent, UrlFormDialogData, ShortUrlResponse>(UrlFormDialogComponent, {
        data: { url },
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.notifications.success('Short URL updated.');
          this.reload();
        }
      });
  }

  protected toggleActive(url: ShortUrlResponse): void {
    const activate = url.status !== 'ACTIVE';
    this.urls.setActive(url.id, activate).subscribe({
      next: () => {
        this.notifications.success(activate ? 'Short URL activated.' : 'Short URL deactivated.');
        this.reload();
      },
      error: (cause: unknown) => this.notifications.error(errorMessage(cause, 'Could not change the status.')),
    });
  }

  protected remove(url: ShortUrlResponse): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete this short URL?',
          message: `/${url.shortCode} will stop working immediately and its click history will be lost. This cannot be undone.`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.urls.delete(url.id).subscribe({
          next: () => {
            this.notifications.success('Short URL deleted.');
            this.reload();
          },
          error: (cause: unknown) => this.notifications.error(errorMessage(cause, 'Could not delete this URL.')),
        });
      });
  }

  protected copy(url: ShortUrlResponse): void {
    if (this.clipboard.copy(url.shortUrl)) {
      this.notifications.success('Short URL copied to clipboard.');
    } else {
      this.notifications.error('Could not copy to the clipboard.');
    }
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.status.setValue('', { emitEvent: false });
    this.reload(true);
  }

  protected get hasFilters(): boolean {
    return this.search.value.trim().length > 0 || this.status.value !== '';
  }
}
