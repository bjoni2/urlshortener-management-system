import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShortUrlResponse } from '../../core/models/api.models';
import { UrlFormDialogComponent, UrlFormDialogData } from './url-form.dialog';

const BASE = 'http://localhost:8080/api/v1/urls';

const EXISTING: ShortUrlResponse = {
  id: 'id-1',
  shortCode: 'my-link',
  shortUrl: 'http://localhost:8080/r/my-link',
  originalUrl: 'https://www.example.com/page',
  status: 'ACTIVE',
  expiresAt: '2027-01-31T23:59:59.000Z',
  clickCount: 5,
  lastAccessedAt: null,
  customAlias: true,
  ownerEmail: 'jane@example.com',
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
};

interface TemplateApi {
  form: {
    invalid: boolean;
    controls: Record<string, { setValue(value: unknown): void; disabled: boolean; errors: unknown }>;
    patchValue(value: Record<string, unknown>): void;
  };
  submit(): void;
  serverError(): string | null;
  editing: boolean;
  minDate: Date | null;
}

const EXPIRED: ShortUrlResponse = { ...EXISTING, status: 'EXPIRED', expiresAt: '2020-01-01T00:00:00.000Z' };

describe('UrlFormDialogComponent', () => {
  let http: HttpTestingController;
  let closedWith: unknown[];

  async function setUp(data: UrlFormDialogData) {
    closedWith = [];
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UrlFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter(),
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    })
      .overrideProvider(MatDialogRef, { useValue: { close: (value?: unknown) => closedWith.push(value) } })
      .compileComponents();

    const fixture = TestBed.createComponent(UrlFormDialogComponent);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    return { fixture, api: fixture.componentInstance as unknown as TemplateApi };
  }

  afterEach(() => http.verify());

  describe('creating', () => {
    it('will not submit without a destination URL', async () => {
      const { api } = await setUp({});

      expect(api.form.invalid).toBe(true);
      api.submit();

      http.expectNone(BASE);
    });

    it('rejects a destination that is not http or https before calling the API', async () => {
      const { api } = await setUp({});
      api.form.controls['originalUrl'].setValue('javascript:alert(1)');

      api.submit();

      http.expectNone(BASE);
    });

    it('rejects an alias with characters that would need escaping', async () => {
      const { api } = await setUp({});
      api.form.patchValue({ originalUrl: 'https://example.com', customAlias: 'not valid!' });

      api.submit();

      http.expectNone(BASE);
    });

    it('sends a valid request and closes with the created URL', async () => {
      const { api } = await setUp({});
      api.form.patchValue({ originalUrl: '  https://example.com/page  ', customAlias: 'my-link' });

      api.submit();

      const request = http.expectOne(BASE);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        originalUrl: 'https://example.com/page',
        customAlias: 'my-link',
        expiresAt: null,
      });
      request.flush(EXISTING);

      expect(closedWith).toEqual([EXISTING]);
    });

    it('sends no alias when the field is left empty', async () => {
      const { api } = await setUp({});
      api.form.patchValue({ originalUrl: 'https://example.com' });

      api.submit();

      const request = http.expectOne(BASE);
      expect(request.request.body.customAlias).toBeNull();
      request.flush(EXISTING);
    });

    it('puts a server-side field error back on the control that caused it', async () => {
      const { api } = await setUp({});
      api.form.patchValue({ originalUrl: 'https://example.com', customAlias: 'my-link' });

      api.submit();
      http.expectOne(BASE).flush(
        { title: 'Validation failed', errors: { customAlias: 'Alias must be between 3 and 32 characters' } },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(api.form.controls['customAlias'].errors).toEqual({
        server: 'Alias must be between 3 and 32 characters',
      });
      expect(api.serverError()).toBeNull();
    });

    it('falls back to a banner when the failure belongs to no single field', async () => {
      const { api } = await setUp({});
      api.form.patchValue({ originalUrl: 'https://example.com', customAlias: 'taken' });

      api.submit();
      http
        .expectOne(BASE)
        .flush({ detail: "The alias 'taken' is already in use." }, { status: 409, statusText: 'Conflict' });

      expect(api.serverError()).toBe("The alias 'taken' is already in use.");
      expect(closedWith).toHaveLength(0);
    });
  });

  describe('the expiration date picker', () => {
    it('opens the calendar when the field itself is clicked, not only the toggle icon', async () => {
      const { fixture } = await setUp({});

      const input = (fixture.nativeElement as HTMLElement).querySelector(
        'input[formcontrolname="expiresDate"]',
      ) as HTMLInputElement;
      expect(input.disabled).toBe(false);

      input.click();
      await fixture.whenStable();

      // A small toggle icon is easy to miss; clicking the field is what users actually try.
      expect(document.querySelector('mat-datepicker-content')).not.toBeNull();
    });

    it('still opens from the toggle icon', async () => {
      const { fixture } = await setUp({});

      const toggle = (fixture.nativeElement as HTMLElement).querySelector(
        'mat-datepicker-toggle button',
      ) as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();

      expect(document.querySelector('mat-datepicker-content')).not.toBeNull();
    });

    it('keeps a stable minimum, so the binding does not churn on every change detection', async () => {
      const { api } = await setUp({});

      expect(api.minDate).toBe(api.minDate);
      expect(api.minDate).toBeInstanceOf(Date);
    });

    it('applies no minimum when editing, so an expired link can still be saved', async () => {
      const { api } = await setUp({ url: EXPIRED });

      expect(api.minDate).toBeNull();
      expect(api.form.controls['expiresDate'].errors).toBeNull();
      // Otherwise the form is unsavable and the documented recovery path is unreachable.
      expect(api.form.invalid).toBe(false);
    });

    it('lets an expired link be revived by pushing its date into the future', async () => {
      const { api } = await setUp({ url: EXPIRED });
      const future = new Date('2027-06-01T00:00:00.000Z');
      api.form.patchValue({ expiresDate: future, expiresTime: future });

      api.submit();

      const request = http.expectOne(`${BASE}/id-1`);
      expect(new Date(request.request.body.expiresAt).getFullYear()).toBe(2027);
      expect(request.request.body.active).toBe(true);
      request.flush({ ...EXPIRED, status: 'ACTIVE', expiresAt: future.toISOString() });
    });
  });

  describe('combining the date and the time', () => {
    it('defaults to the end of the chosen day when no time is given', () => {
      const combined = UrlFormDialogComponent.combineExpiry(new Date(2027, 0, 31), null);
      const result = new Date(combined!);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getDate()).toBe(31);
    });

    it('takes the hours and minutes from the time field', () => {
      const time = new Date(2000, 0, 1, 9, 45);
      const combined = UrlFormDialogComponent.combineExpiry(new Date(2027, 0, 31), time);
      const result = new Date(combined!);

      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(45);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getDate()).toBe(31);
    });

    it('means "no expiry" when there is no date, whatever the time says', () => {
      expect(UrlFormDialogComponent.combineExpiry(null, null)).toBeNull();
      expect(UrlFormDialogComponent.combineExpiry(null, new Date(2000, 0, 1, 9, 0))).toBeNull();
    });
  });

  describe('the time picker', () => {
    it('renders a time field alongside the date', async () => {
      const { fixture } = await setUp({});
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('input[formcontrolname="expiresTime"]')).not.toBeNull();
      expect(element.querySelector('mat-timepicker-toggle')).not.toBeNull();
    });

    it('opens the time list from its toggle', async () => {
      const { fixture } = await setUp({});

      const toggle = (fixture.nativeElement as HTMLElement).querySelector(
        'mat-timepicker-toggle button',
      ) as HTMLButtonElement;
      toggle.click();
      await fixture.whenStable();

      expect(document.querySelector('mat-option, .mat-timepicker-panel')).not.toBeNull();
    });
  });

  describe('editing', () => {
    it('locks the fields the API does not allow changing', async () => {
      const { api } = await setUp({ url: EXISTING });

      expect(api.editing).toBe(true);
      expect(api.form.controls['originalUrl'].disabled).toBe(true);
      expect(api.form.controls['customAlias'].disabled).toBe(true);
    });

    it('sends only the expiration date and the activation state', async () => {
      const { api } = await setUp({ url: EXISTING });
      api.form.patchValue({ active: false });

      api.submit();

      const request = http.expectOne(`${BASE}/id-1`);
      expect(request.request.method).toBe('PUT');
      // The pre-filled date and time recombine to the same wall-clock moment they came from.
      const sent = new Date(request.request.body.expiresAt);
      const original = new Date(EXISTING.expiresAt!);
      expect(sent.getFullYear()).toBe(original.getFullYear());
      expect(sent.getHours()).toBe(original.getHours());
      expect(sent.getMinutes()).toBe(original.getMinutes());
      expect(request.request.body.active).toBe(false);
      request.flush({ ...EXISTING, status: 'INACTIVE' });

      expect(closedWith).toHaveLength(1);
    });

    it('sends a null expiration when the link is marked as never expiring', async () => {
      const { api } = await setUp({ url: EXISTING });
      api.form.patchValue({ neverExpires: true });

      api.submit();

      const request = http.expectOne(`${BASE}/id-1`);
      expect(request.request.body).toEqual({ expiresAt: null, active: true });
      request.flush(EXISTING);
    });

    it('disables both expiry fields while the link never expires', async () => {
      const { api, fixture } = await setUp({ url: { ...EXISTING, expiresAt: null } });
      await fixture.whenStable();

      expect(api.form.controls['expiresDate'].disabled).toBe(true);
      expect(api.form.controls['expiresTime'].disabled).toBe(true);
    });
  });
});
