import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageResponse, ShortUrlResponse, UrlStats } from '../../core/models/api.models';
import { DashboardComponent } from './dashboard.component';

const STATS_URL = 'http://localhost:8080/api/v1/urls/stats';
const LIST_URL = 'http://localhost:8080/api/v1/urls';

const STATS: UrlStats = {
  totalUrls: 7,
  activeUrls: 4,
  inactiveUrls: 1,
  expiredUrls: 2,
  totalClicks: 123,
};

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

function page(content: ShortUrlResponse[]): PageResponse<ShortUrlResponse> {
  return { content, page: 0, size: 5, totalElements: content.length, totalPages: 1, first: true, last: true };
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // forkJoin cancels its siblings as soon as one fails, so cancelled requests are expected here.
    http.verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  function respond(stats: UrlStats, recent: ShortUrlResponse[]) {
    http.expectOne(STATS_URL).flush(stats);
    http.expectOne((request) => request.url === LIST_URL).flush(page(recent));
  }

  it('shows a loading state before the data arrives', async () => {
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('mat-spinner')).not.toBeNull();
    respond(STATS, []);
  });

  it('renders every dashboard counter the brief asks for', async () => {
    await fixture.whenStable();
    respond(STATS, [url()]);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total URLs');
    expect(text).toContain('Active');
    expect(text).toContain('Expired');
    expect(text).toContain('Total clicks');

    const values = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.stat-value')].map(
      (node) => node.textContent?.trim(),
    );
    expect(values).toEqual(['7', '4', '2', '1', '123']);
  });

  it('lists the most recent links with their status', async () => {
    await fixture.whenStable();
    respond(STATS, [url({ shortCode: 'aB3dEf9' }), url({ id: 'id-2', shortCode: 'my-link', status: 'EXPIRED' })]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.recent-item')).toHaveLength(2);
    expect(element.textContent).toContain('/aB3dEf9');
    expect(element.textContent).toContain('/my-link');
    expect(element.textContent).toContain('Expired');
  });

  it('only requests the five newest links for the summary', async () => {
    await fixture.whenStable();
    http.expectOne(STATS_URL).flush(STATS);

    const request = http.expectOne((candidate) => candidate.url === LIST_URL);
    expect(request.request.params.get('size')).toBe('5');
    expect(request.request.params.get('sort')).toBe('createdAt,desc');
    request.flush(page([]));
  });

  it('invites a new user to create their first link', async () => {
    await fixture.whenStable();
    respond({ totalUrls: 0, activeUrls: 0, inactiveUrls: 0, expiredUrls: 0, totalClicks: 0 }, []);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No links yet.');
  });

  it('offers a retry when the dashboard cannot be loaded', async () => {
    await fixture.whenStable();
    http.expectOne(STATS_URL).flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Boom');

    // Drain the sibling request forkJoin cancelled, so the retry's own requests stand alone.
    http.match((request) => request.url === LIST_URL);

    const retry = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Try again'));
    retry?.click();

    respond(STATS, []);
  });
});
