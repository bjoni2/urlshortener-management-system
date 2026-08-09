import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminService } from '../../core/api/admin.service';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http/api-error';
import { Role, UserResponse } from '../../core/models/api.models';
import { NotificationService } from '../../core/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { RelativeTimePipe } from '../../shared/relative-time.pipe';

@Component({
  selector: 'app-admin-users',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    RelativeTimePipe,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  private readonly admin = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  protected readonly auth = inject(AuthService);

  protected readonly displayedColumns = ['email', 'role', 'enabled', 'createdAt', 'actions'];

  protected readonly rows = signal<readonly UserResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly role = new FormControl<Role | ''>('', { nonNullable: true });
  protected readonly enabled = new FormControl<'' | 'true' | 'false'>('', { nonNullable: true });

  private page = 0;
  private size = 10;
  private sort = 'createdAt,desc';

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload(true));
    this.role.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload(true));
    this.enabled.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload(true));

    this.reload();
  }

  protected reload(resetPage = false): void {
    if (resetPage) {
      this.page = 0;
    }
    this.loading.set(true);
    this.error.set(null);

    this.admin
      .listUsers({
        page: this.page,
        size: this.size,
        sort: this.sort,
        search: this.search.value.trim(),
        role: this.role.value,
        enabled: this.enabled.value === '' ? null : this.enabled.value === 'true',
      })
      .subscribe({
        next: (result) => {
          this.rows.set(result.content);
          this.total.set(result.totalElements);
          this.loading.set(false);
        },
        error: (cause: unknown) => {
          this.error.set(errorMessage(cause, 'Could not load the user list.'));
          this.loading.set(false);
        },
      });
  }

  protected onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.reload();
  }

  protected onSort(event: Sort): void {
    this.sort = event.direction ? `${event.active},${event.direction}` : 'createdAt,desc';
    this.reload(true);
  }

  protected get pageIndex(): number {
    return this.page;
  }

  protected get pageSize(): number {
    return this.size;
  }

  protected isSelf(user: UserResponse): boolean {
    return this.auth.user()?.id === user.id;
  }

  protected toggleEnabled(user: UserResponse): void {
    if (user.enabled) {
      this.confirmDeactivation(user);
      return;
    }
    this.applyEnabled(user, true);
  }

  private confirmDeactivation(user: UserResponse): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: `Deactivate ${user.email}?`,
          message:
            'They will be signed out immediately and cannot sign in again until the account is reactivated. Their short URLs keep working.',
          confirmLabel: 'Deactivate',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyEnabled(user, false);
        }
      });
  }

  private applyEnabled(user: UserResponse, enabled: boolean): void {
    this.admin.setUserEnabled(user.id, enabled).subscribe({
      next: () => {
        this.notifications.success(enabled ? `${user.email} activated.` : `${user.email} deactivated.`);
        this.reload();
      },
      error: (cause: unknown) => this.notifications.error(errorMessage(cause, 'Could not update this account.')),
    });
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.role.setValue('', { emitEvent: false });
    this.enabled.setValue('', { emitEvent: false });
    this.reload(true);
  }

  protected get hasFilters(): boolean {
    return this.search.value.trim().length > 0 || this.role.value !== '' || this.enabled.value !== '';
  }
}
