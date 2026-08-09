import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PageResponse, ShortUrlResponse, UrlStats } from '../../core/models/api.models';
import { NotificationService } from '../../core/notification.service';
import { AdminUrlsComponent } from './admin-urls.component';

const URLS_URL = 'http://localhost:8080/api/v1/admin/urls';
const STATS_URL = 'http://localhost:8080/api/v1/admin/urls/stats';

const STATS: UrlStats = { totalUrls: 9, activeUrls: 6, inactiveUrls: 1, expiredUrls: 2, totalClicks: 250 };

function url(overrides: Partial<ShortUrlResponse> = {}): ShortUrlResponse {
  return {
    id: 'id-1',
    shortCode: 'aB3dEf9',
    shortUrl: 'http://localhost:8080/r/aB3dEf9',
    originalUrl: 'https://www.example.com/page',
    status: 'ACTIVE',
    expiresAt: null,
    clickCount: 12,
    lastAccessedAt: null,
    customAlias: false,
    ownerEmail: 'jane@example.com',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

function page(content: ShortUrlResponse[]): PageResponse<ShortUrlResponse> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true };
}

interface TemplateApi {
  search: { setValue(value: string): void };
  status: { setValue(value: string): void };
  ownerEmail: { setValue(value: string): void };
  reload(resetPage?: boolean): void;
  onSort(event: { active: string; direction: 'asc' | 'desc' | '' }): void;
  remove(url: ShortUrlResponse): void;
  clearFilters(): void;
}

describe('AdminUrlsComponent', () => {
  let fixture: ComponentFixture<AdminUrlsComponent>;
  let api: TemplateApi;
  let http: HttpTestingController;
  let dialogResult: boolean | undefined;
  let notifications: { success: string[]; error: string[] };

  beforeEach(async () => {
    localStorage.clear();
    dialogResult = true;
    notifications = { success: [], error: [] };

    await TestBed.configureTestingModule({
      imports: [AdminUrlsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
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

    fixture = TestBed.createComponent(AdminUrlsComponent);
    api = fixture.componentInstance as unknown as TemplateApi;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // forkJoin cancels its siblings as soon as one fails, so cancelled requests are expected here.
    http.verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  function respond(content: ShortUrlResponse[] = [url()]): TestRequest {
    const list = http.expectOne((candidate) => candidate.url === URLS_URL);
    list.flush(page(content));
    http.expectOne(STATS_URL).flush(STATS);
    return list;
  }

  it('shows system-wide counters alongside the list', async () => {
    await fixture.whenStable();
    respond();
    await fixture.whenStable();

    const values = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.stat-value')].map(
      (node) => node.textContent?.trim(),
    );
    expect(values).toEqual(['9', '6', '2', '250']);
  });

  it('lists URLs from every account with their owner', async () => {
    await fixture.whenStable();
    respond([url(), url({ id: 'id-2', shortCode: 'bobs-one', ownerEmail: 'bob@example.com' })]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('jane@example.com');
    expect(element.textContent).toContain('bob@example.com');
  });

  it('narrows the list by owner, search and status together', async () => {
    await fixture.whenStable();
    respond();

    api.ownerEmail.setValue('bob@');
    api.status.setValue('EXPIRED');
    const request = respond();

    expect(request.request.params.get('ownerEmail')).toBe('bob@');
    expect(request.request.params.get('status')).toBe('EXPIRED');
  });

  it('clears every filter at once', async () => {
    await fixture.whenStable();
    respond();

    api.status.setValue('ACTIVE');
    respond();

    api.clearFilters();
    expect(respond().request.params.has('status')).toBe(false);
  });

  it('sorts server-side', async () => {
    await fixture.whenStable();
    respond();

    api.onSort({ active: 'clickCount', direction: 'desc' });
    expect(respond().request.params.get('sort')).toBe('clickCount,desc');
  });

  it('deletes any account’s URL, but only after confirmation', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = false;
    api.remove(url());
    http.expectNone(`${URLS_URL}/id-1`);

    dialogResult = true;
    api.remove(url());
    http.expectOne(`${URLS_URL}/id-1`).flush(null);
    respond();

    expect(notifications.success).toEqual(['Short URL deleted.']);
  });

  it('reports a failed deletion', async () => {
    await fixture.whenStable();
    respond();

    api.remove(url());
    http.expectOne(`${URLS_URL}/id-1`).flush({ detail: 'Short URL not found.' }, { status: 404, statusText: 'Not Found' });

    expect(notifications.error).toEqual(['Short URL not found.']);
  });

  it('offers a retry when the list cannot be loaded', async () => {
    await fixture.whenStable();
    http
      .expectOne((candidate) => candidate.url === URLS_URL)
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Boom');

    http.match(STATS_URL);
    api.reload();
    respond();
  });
});
