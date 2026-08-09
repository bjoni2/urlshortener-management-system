import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PageResponse, UserResponse } from '../../core/models/api.models';
import { NotificationService } from '../../core/notification.service';
import { AdminUsersComponent } from './admin-users.component';

const USERS_URL = 'http://localhost:8080/api/v1/admin/users';

const ADMIN: UserResponse = {
  id: 'admin-id',
  email: 'admin@example.com',
  role: 'ADMIN',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
};

function user(overrides: Partial<UserResponse> = {}): UserResponse {
  return { id: 'user-1', email: 'jane@example.com', role: 'USER', enabled: true, createdAt: '2026-05-01T00:00:00Z', ...overrides };
}

function page(content: UserResponse[]): PageResponse<UserResponse> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true };
}

interface TemplateApi {
  search: { setValue(value: string): void };
  role: { setValue(value: string): void };
  enabled: { setValue(value: string): void };
  reload(resetPage?: boolean): void;
  onSort(event: { active: string; direction: 'asc' | 'desc' | '' }): void;
  toggleEnabled(user: UserResponse): void;
  isSelf(user: UserResponse): boolean;
  clearFilters(): void;
}

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let api: TemplateApi;
  let http: HttpTestingController;
  let dialogResult: boolean | undefined;
  let notifications: { success: string[]; error: string[] };

  beforeEach(async () => {
    localStorage.clear();
    dialogResult = true;
    notifications = { success: [], error: [] };

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { user: () => ADMIN, isAdmin: () => true } },
        {
          provide: NotificationService,
          useValue: {
            success: (message: string) => notifications.success.push(message),
            error: (message: string) => notifications.error.push(message),
          },
        },
      ],
    })
      .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } })
      .compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    api = fixture.componentInstance as unknown as TemplateApi;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function respond(content: UserResponse[] = [ADMIN, user()]): TestRequest {
    const request = http.expectOne((candidate) => candidate.url === USERS_URL);
    request.flush(page(content));
    return request;
  }

  it('lists registered accounts with their role and state', async () => {
    await fixture.whenStable();
    respond();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('admin@example.com');
    expect(element.textContent).toContain('Administrator');
    expect(element.textContent).toContain('jane@example.com');
    expect(element.textContent).toContain('Active');
  });

  it('marks the signed-in administrator so they can see which row is theirs', async () => {
    await fixture.whenStable();
    respond();
    await fixture.whenStable();

    expect(api.isSelf(ADMIN)).toBe(true);
    expect(api.isSelf(user())).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('You');
  });

  it('passes the search, role and state filters to the server', async () => {
    await fixture.whenStable();
    respond();

    api.role.setValue('ADMIN');
    expect(respond().request.params.get('role')).toBe('ADMIN');

    api.enabled.setValue('false');
    const request = respond();
    expect(request.request.params.get('enabled')).toBe('false');
    expect(request.request.params.get('page')).toBe('0');
  });

  it('omits the state filter entirely when "all accounts" is chosen', async () => {
    await fixture.whenStable();
    respond();

    api.enabled.setValue('true');
    respond();

    api.enabled.setValue('');
    expect(respond().request.params.has('enabled')).toBe(false);
  });

  it('clears every filter at once', async () => {
    await fixture.whenStable();
    respond();

    api.role.setValue('USER');
    respond();

    api.clearFilters();
    const request = respond();
    expect(request.request.params.has('role')).toBe(false);
  });

  it('sorts server-side', async () => {
    await fixture.whenStable();
    respond();

    api.onSort({ active: 'email', direction: 'asc' });
    expect(respond().request.params.get('sort')).toBe('email,asc');

    api.onSort({ active: 'email', direction: '' });
    expect(respond().request.params.get('sort')).toBe('createdAt,desc');
  });

  it('asks for confirmation before deactivating an account', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = false;
    api.toggleEnabled(user());
    http.expectNone(`${USERS_URL}/user-1/deactivate`);

    dialogResult = true;
    api.toggleEnabled(user());
    http.expectOne(`${USERS_URL}/user-1/deactivate`).flush(user({ enabled: false }));
    respond();

    expect(notifications.success).toEqual(['jane@example.com deactivated.']);
  });

  it('reactivates without a confirmation prompt, since nothing is lost', async () => {
    await fixture.whenStable();
    respond();

    api.toggleEnabled(user({ enabled: false }));
    http.expectOne(`${USERS_URL}/user-1/activate`).flush(user());
    respond();

    expect(notifications.success).toEqual(['jane@example.com activated.']);
  });

  it('surfaces the server’s refusal when an administrator targets their own account', async () => {
    await fixture.whenStable();
    respond();

    api.toggleEnabled(ADMIN);
    http
      .expectOne(`${USERS_URL}/admin-id/deactivate`)
      .flush({ detail: 'You cannot deactivate your own account.' }, { status: 400, statusText: 'Bad Request' });

    expect(notifications.error).toEqual(['You cannot deactivate your own account.']);
  });

  it('offers a retry when the list cannot be loaded', async () => {
    await fixture.whenStable();
    http
      .expectOne((candidate) => candidate.url === USERS_URL)
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Boom');

    api.reload();
    respond();
  });
});
