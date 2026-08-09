import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { StatCardComponent } from './stat-card.component';
import { UrlStatusChipComponent } from './url-status-chip.component';

describe('StatCardComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }),
  );

  it('renders the value, label and icon it is given', async () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Total clicks');
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('icon', 'ads_click');
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.stat-value')?.textContent?.trim()).toBe('42');
    expect(element.querySelector('.stat-label')?.textContent?.trim()).toBe('Total clicks');
    expect(element.querySelector('mat-icon')?.textContent?.trim()).toBe('ads_click');
  });

  it('applies the requested tone, defaulting to primary', async () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Expired');
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('icon', 'schedule');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.stat-card')?.className).toContain('tone-primary');

    fixture.componentRef.setInput('tone', 'warn');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.stat-card')?.className).toContain('tone-warn');
  });
});

describe('UrlStatusChipComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }),
  );

  async function render(status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED') {
    const fixture = TestBed.createComponent(UrlStatusChipComponent);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('labels each state in words, so colour is never the only signal', async () => {
    expect((await render('ACTIVE')).textContent).toContain('Active');
    expect((await render('INACTIVE')).textContent).toContain('Inactive');
    expect((await render('EXPIRED')).textContent).toContain('Expired');
  });

  it('gives each state its own icon', async () => {
    expect((await render('ACTIVE')).querySelector('mat-icon')?.textContent?.trim()).toBe('check_circle');
    expect((await render('INACTIVE')).querySelector('mat-icon')?.textContent?.trim()).toBe('pause_circle');
    expect((await render('EXPIRED')).querySelector('mat-icon')?.textContent?.trim()).toBe('schedule');
  });
});

describe('ConfirmDialogComponent', () => {
  const closed: (boolean | undefined)[] = [];

  function configure(data: ConfirmDialogData) {
    closed.length = 0;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: { close: (value?: boolean) => closed.push(value) } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
  }

  it('shows the title and message, and resolves true only on confirm', async () => {
    configure({ title: 'Delete this short URL?', message: 'This cannot be undone.', confirmLabel: 'Delete' });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Delete this short URL?');
    expect(element.textContent).toContain('This cannot be undone.');

    const buttons = [...element.querySelectorAll('button')];
    buttons.find((button) => button.textContent?.includes('Cancel'))?.click();
    buttons.find((button) => button.textContent?.includes('Delete'))?.click();

    expect(closed).toEqual([false, true]);
  });

  it('falls back to a neutral confirm label', async () => {
    configure({ title: 'Are you sure?', message: 'Proceed?' });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Confirm');
  });
});
