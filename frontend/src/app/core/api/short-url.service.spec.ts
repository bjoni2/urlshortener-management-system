import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShortUrlService, toHttpParams } from './short-url.service';

const BASE = 'http://localhost:8080/api/v1/urls';

describe('toHttpParams', () => {
  it('omits empty filters so the request URL carries only what was actually asked for', () => {
    const params = toHttpParams({ page: 0, size: 10, search: '', status: null, sort: undefined, owner: 'a@b.co' });

    expect(params.toString()).toBe('page=0&size=10&owner=a@b.co');
  });

  it('keeps a false value, which is a real filter and not an absent one', () => {
    expect(toHttpParams({ enabled: false }).get('enabled')).toBe('false');
  });
});

describe('ShortUrlService', () => {
  let service: ShortUrlService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShortUrlService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('passes search, filter, sort and paging to the API', () => {
    service.list({ page: 2, size: 25, sort: 'clickCount,desc', search: 'example', status: 'ACTIVE' }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === BASE);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
    expect(request.request.params.get('sort')).toBe('clickCount,desc');
    expect(request.request.params.get('search')).toBe('example');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush({ content: [], page: 2, size: 25, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('creates a short URL', () => {
    service.create({ originalUrl: 'https://example.com', customAlias: 'my-link', expiresAt: null }).subscribe();

    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      originalUrl: 'https://example.com',
      customAlias: 'my-link',
      expiresAt: null,
    });
    request.flush({});
  });

  it('updates the expiration date and activation state together', () => {
    service.update('abc', { expiresAt: '2027-01-01T00:00:00Z', active: false }).subscribe();

    const request = http.expectOne(`${BASE}/abc`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ expiresAt: '2027-01-01T00:00:00Z', active: false });
    request.flush({});
  });

  it('uses the dedicated endpoint for each activation shortcut', () => {
    service.setActive('abc', true).subscribe();
    const activate = http.expectOne(`${BASE}/abc/activate`);
    expect(activate.request.method).toBe('PATCH');
    activate.flush({});

    service.setActive('abc', false).subscribe();
    http.expectOne(`${BASE}/abc/deactivate`).flush({});
  });

  it('deletes by id', () => {
    service.delete('abc').subscribe();

    const request = http.expectOne(`${BASE}/abc`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('fetches the dashboard counters', () => {
    service.stats().subscribe();

    http.expectOne(`${BASE}/stats`).flush({
      totalUrls: 3,
      activeUrls: 2,
      inactiveUrls: 0,
      expiredUrls: 1,
      totalClicks: 9,
    });
  });
});
