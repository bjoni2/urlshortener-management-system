import { Clipboard } from '@angular/cdk/clipboard';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PageResponse, ShortUrlResponse } from '../../core/models/api.models';
import { NotificationService } from '../../core/notification.service';
import { UrlListComponent } from './url-list.component';

const LIST_URL = 'http://localhost:8080/api/v1/urls';

function url(overrides: Partial<ShortUrlResponse> = {}): ShortUrlResponse {
  return {
    id: 'id-1',
    shortCode: 'aB3dEf9',
    shortUrl: 'http://localhost:8080/r/aB3dEf9',
    originalUrl: 'https://www.example.com/a/long/path',
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

function page(content: ShortUrlResponse[], totalElements = content.length): PageResponse<ShortUrlResponse> {
  return { content, page: 0, size: 10, totalElements, totalPages: 1, first: true, last: true };
}

interface TemplateApi {
  search: { setValue(value: string): void; value: string };
  status: { setValue(value: string): void };
  reload(resetPage?: boolean): void;
  onPage(event: { pageIndex: number; pageSize: number; length: number }): void;
  onSort(event: { active: string; direction: 'asc' | 'desc' | '' }): void;
  create(): void;
  edit(url: ShortUrlResponse): void;
  toggleActive(url: ShortUrlResponse): void;
  remove(url: ShortUrlResponse): void;
  copy(url: ShortUrlResponse): void;
  clearFilters(): void;
  hasFilters: boolean;
}

describe('UrlListComponent', () => {
  let fixture: ComponentFixture<UrlListComponent>;
  let api: TemplateApi;
  let http: HttpTestingController;
  let dialogResult: unknown;
  let notifications: { success: string[]; error: string[] };
  let copied: string[];

  beforeEach(async () => {
    localStorage.clear();
    dialogResult = undefined;
    notifications = { success: [], error: [] };
    copied = [];

    await TestBed.configureTestingModule({
      imports: [UrlListComponent],
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
        { provide: Clipboard, useValue: { copy: (value: string) => (copied.push(value), true) } },
      ],
    })
      // The component imports MatDialogModule, whose provider would otherwise shadow a plain
      // TestBed provider; overrideProvider replaces it wherever it is declared.
      .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } })
      .compileComponents();

    fixture = TestBed.createComponent(UrlListComponent);
    api = fixture.componentInstance as unknown as TemplateApi;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  /** Answers the outstanding list request and returns it, so its params can be asserted. */
  function respond(content: ShortUrlResponse[] = [url()], totalElements = content.length): TestRequest {
    const request = http.expectOne((candidate) => candidate.url === LIST_URL);
    request.flush(page(content, totalElements));
    return request;
  }

  it('loads the first page on open, newest first', async () => {
    await fixture.whenStable();

    const request = respond();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('sort')).toBe('createdAt,desc');
  });

  it('renders a row per URL with its code, status and click count', async () => {
    await fixture.whenStable();
    respond([url(), url({ id: 'id-2', shortCode: 'my-link', status: 'EXPIRED', clickCount: 0 })]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('/aB3dEf9');
    expect(element.textContent).toContain('/my-link');
    expect(element.textContent).toContain('Active');
    expect(element.textContent).toContain('Expired');
    expect(element.querySelector('mat-paginator')).not.toBeNull();
  });

  it('sends the status filter to the server and returns to the first page', async () => {
    await fixture.whenStable();
    respond();

    api.onPage({ pageIndex: 3, pageSize: 10, length: 100 });
    respond();

    api.status.setValue('EXPIRED');
    const request = respond();

    expect(request.request.params.get('status')).toBe('EXPIRED');
    expect(request.request.params.get('page')).toBe('0');
  });

  it('sorts server-side and falls back to the default order when sorting is cleared', async () => {
    await fixture.whenStable();
    respond();

    api.onSort({ active: 'clickCount', direction: 'desc' });
    expect(respond().request.params.get('sort')).toBe('clickCount,desc');

    api.onSort({ active: 'clickCount', direction: '' });
    expect(respond().request.params.get('sort')).toBe('createdAt,desc');
  });

  it('passes the requested page and size straight through', async () => {
    await fixture.whenStable();
    respond();

    api.onPage({ pageIndex: 2, pageSize: 25, length: 100 });
    const request = respond();

    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
  });

  it('distinguishes an empty account from an over-filtered list', async () => {
    await fixture.whenStable();
    respond([]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("haven't shortened anything yet");

    api.status.setValue('EXPIRED');
    respond([]);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No URLs match these filters');
  });

  it('clears every filter at once and reloads', async () => {
    await fixture.whenStable();
    respond();

    api.status.setValue('ACTIVE');
    respond();
    expect(api.hasFilters).toBe(true);

    api.clearFilters();
    respond();
    expect(api.hasFilters).toBe(false);
  });

  it('reloads after a URL is created and confirms it', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = url({ shortUrl: 'http://localhost:8080/r/new-one' });
    api.create();
    respond();

    expect(notifications.success).toEqual(['Created http://localhost:8080/r/new-one']);
  });

  it('does nothing when the create dialog is dismissed', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = undefined;
    api.create();

    http.expectNone((candidate) => candidate.url === LIST_URL);
    expect(notifications.success).toHaveLength(0);
  });

  it('reloads after an edit is saved', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = url();
    api.edit(url());
    respond();

    expect(notifications.success).toEqual(['Short URL updated.']);
  });

  it('deactivates an active URL through the dedicated endpoint', async () => {
    await fixture.whenStable();
    respond();

    api.toggleActive(url({ status: 'ACTIVE' }));
    http.expectOne(`${LIST_URL}/id-1/deactivate`).flush(url({ status: 'INACTIVE' }));
    respond();

    expect(notifications.success).toEqual(['Short URL deactivated.']);
  });

  it('activates an inactive URL', async () => {
    await fixture.whenStable();
    respond();

    api.toggleActive(url({ status: 'INACTIVE' }));
    http.expectOne(`${LIST_URL}/id-1/activate`).flush(url());
    respond();

    expect(notifications.success).toEqual(['Short URL activated.']);
  });

  it('reports why a status change was refused', async () => {
    await fixture.whenStable();
    respond();

    api.toggleActive(url({ status: 'EXPIRED' }));
    http
      .expectOne(`${LIST_URL}/id-1/activate`)
      .flush({ detail: 'This link has expired. Extend its expiration date to reactivate it.' }, { status: 400, statusText: 'Bad Request' });

    expect(notifications.error).toEqual(['This link has expired. Extend its expiration date to reactivate it.']);
  });

  it('deletes only after the confirmation is accepted', async () => {
    await fixture.whenStable();
    respond();

    dialogResult = false;
    api.remove(url());
    http.expectNone(`${LIST_URL}/id-1`);

    dialogResult = true;
    api.remove(url());
    http.expectOne(`${LIST_URL}/id-1`).flush(null);
    respond();

    expect(notifications.success).toEqual(['Short URL deleted.']);
  });

  it('copies the absolute short URL, not just the code', async () => {
    await fixture.whenStable();
    respond();

    api.copy(url());

    expect(copied).toEqual(['http://localhost:8080/r/aB3dEf9']);
    expect(notifications.success).toEqual(['Short URL copied to clipboard.']);
  });

  it('offers a retry when the list cannot be loaded', async () => {
    await fixture.whenStable();
    http
      .expectOne((candidate) => candidate.url === LIST_URL)
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Boom');

    api.reload();
    respond();
  });
});
