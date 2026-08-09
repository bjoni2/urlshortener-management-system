import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { Observable } from 'rxjs';
import { ShortUrlService } from '../../core/api/short-url.service';
import { errorMessage, fieldErrors } from '../../core/http/api-error';
import { ShortUrlResponse } from '../../core/models/api.models';

export interface UrlFormDialogData {
  /** Present when editing; absent when creating. */
  readonly url?: ShortUrlResponse;
}

/**
 * Creates a short URL, or edits the expiration date and activation state of an existing one.
 *
 * <p>Creation and editing share a dialog because they show the same information; the fields the API
 * does not allow changing after creation are simply rendered read-only.
 */
@Component({
  selector: 'app-url-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatTimepickerModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './url-form.dialog.html',
  styleUrl: './url-form.dialog.scss',
})
export class UrlFormDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly urls = inject(ShortUrlService);

  protected readonly dialogRef =
    inject<MatDialogRef<UrlFormDialogComponent, ShortUrlResponse>>(MatDialogRef);
  protected readonly data = inject<UrlFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected readonly editing = !!this.data.url;
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    originalUrl: [
      this.data.url?.originalUrl ?? '',
      // Surrounding whitespace is tolerated: URLs are usually pasted, and the value is trimmed
      // before it is sent. Rejecting a stray trailing space would be baffling.
      [Validators.required, Validators.maxLength(2048), Validators.pattern(/^\s*https?:\/\/\S.*\s*$/i)],
    ],
    customAlias: [
      this.data.url?.shortCode ?? '',
      [Validators.minLength(3), Validators.maxLength(32), Validators.pattern(/^\s*[A-Za-z0-9_-]*\s*$/)],
    ],
    // The expiration is one instant, but it is edited as a date and a time, because a single text
    // field forces the user to know and type an exact format.
    expiresDate: [this.data.url?.expiresAt ? new Date(this.data.url.expiresAt) : (null as Date | null)],
    expiresTime: [this.data.url?.expiresAt ? new Date(this.data.url.expiresAt) : (null as Date | null)],
    neverExpires: [this.editing ? this.data.url?.expiresAt === null : false],
    active: [this.data.url ? this.data.url.status !== 'INACTIVE' : true],
  });

  constructor() {
    if (this.editing) {
      // The target and the alias are immutable once a link is published.
      this.form.controls.originalUrl.disable();
      this.form.controls.customAlias.disable();
    }
    this.syncExpiryEnabled();
    this.form.controls.neverExpires.valueChanges.subscribe(() => this.syncExpiryEnabled());
  }

  /** Both expiry fields are meaningless while "never expires" is on, so they are disabled. */
  private syncExpiryEnabled(): void {
    const disabled = this.form.controls.neverExpires.value;
    for (const control of [this.form.controls.expiresDate, this.form.controls.expiresTime]) {
      if (disabled) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }

  /**
   * Folds the two controls back into the single instant the API expects.
   *
   * <p>A date with no time defaults to the end of that day: "expires on the 3rd" almost always means
   * "still works throughout the 3rd", and expiring at midnight would silently cost the user a day.
   */
  static combineExpiry(date: Date | null, time: Date | null): string | null {
    if (!date) {
      return null;
    }
    const combined = new Date(date);
    if (time) {
      combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    } else {
      combined.setHours(23, 59, 0, 0);
    }
    return combined.toISOString();
  }

  /**
   * Earliest date the picker offers when creating a link.
   *
   * <p>Computed once rather than from a getter: a getter would hand the `[min]` binding a fresh
   * object on every change-detection pass, which Angular reports as a changed-after-checked error.
   *
   * <p>It is deliberately not applied when editing. An expired link's date is already in the past,
   * and a minimum would mark the pre-filled value invalid and block the very edit that revives it —
   * and the API accepts a past date on update, as the way to expire a link immediately.
   */
  protected readonly minDate: Date | null = this.editing ? null : new Date();

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);
    const value = this.form.getRawValue();
    const expiresAt = value.neverExpires
      ? null
      : UrlFormDialogComponent.combineExpiry(value.expiresDate, value.expiresTime);

    const request: Observable<ShortUrlResponse> = this.editing
      ? this.urls.update(this.data.url!.id, { expiresAt, active: value.active })
      : this.urls.create({
          originalUrl: value.originalUrl.trim(),
          customAlias: value.customAlias.trim() || null,
          expiresAt,
        });

    request.subscribe({
      next: (saved) => this.dialogRef.close(saved),
      error: (cause: unknown) => {
        this.submitting.set(false);
        this.applyServerValidation(cause);
      },
    });
  }

  /** Puts server-side field errors back on the controls that caused them, not just in a banner. */
  private applyServerValidation(cause: unknown): void {
    const errors = fieldErrors(cause);
    let attached = false;
    for (const [field, message] of Object.entries(errors)) {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ server: message });
        control.markAsTouched();
        attached = true;
      }
    }
    if (!attached) {
      this.serverError.set(errorMessage(cause, 'Could not save this URL.'));
    }
  }
}
