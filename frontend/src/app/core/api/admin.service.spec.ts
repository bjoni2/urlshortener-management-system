import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';

const BASE = 'http://localhost:8080/api/v1/admin';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists users with search, role and state filters', () => {
    service.listUsers({ page: 0, size: 10, sort: 'email,asc', search: 'jane', role: 'USER', enabled: false }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${BASE}/users`);
    expect(request.request.params.get('search')).toBe('jane');
    expect(request.request.params.get('role')).toBe('USER');
    expect(request.request.params.get('enabled')).toBe('false');
    request.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('drops a null state filter rather than sending it as a value', () => {
    service.listUsers({ page: 0, size: 10, sort: 'email,asc', enabled: null }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${BASE}/users`);
    expect(request.request.params.has('enabled')).toBe(false);
    request.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('activates and deactivates through their own endpoints', () => {
    service.setUserEnabled('user-1', true).subscribe();
    const activate = http.expectOne(`${BASE}/users/user-1/activate`);
    expect(activate.request.method).toBe('PATCH');
    activate.flush({});

    service.setUserEnabled('user-1', false).subscribe();
    http.expectOne(`${BASE}/users/user-1/deactivate`).flush({});
  });

  it('lists every URL, optionally narrowed to one owner', () => {
    service.listUrls({ page: 1, size: 25, sort: 'clickCount,desc', ownerEmail: 'bob@' }).subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${BASE}/urls`);
    expect(request.request.params.get('ownerEmail')).toBe('bob@');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ content: [], page: 1, size: 25, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('fetches the system-wide counters', () => {
    service.stats().subscribe();

    http.expectOne(`${BASE}/urls/stats`).flush({
      totalUrls: 1,
      activeUrls: 1,
      inactiveUrls: 0,
      expiredUrls: 0,
      totalClicks: 0,
    });
  });

  it('deletes any URL by id', () => {
    service.deleteUrl('id-1').subscribe();

    const request = http.expectOne(`${BASE}/urls/id-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
