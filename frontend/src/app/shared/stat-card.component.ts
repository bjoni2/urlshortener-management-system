import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  template: `
    <div class="stat-card" [class]="'tone-' + tone()">
      <div class="stat-icon"><mat-icon>{{ icon() }}</mat-icon></div>
      <div class="stat-body">
        <div class="stat-value">{{ value() }}</div>
        <div class="stat-label">{{ label() }}</div>
      </div>
    </div>
  `,
  styles: `
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: 0.875rem;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      height: 100%;
      box-sizing: border-box;
    }

    .stat-icon {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.75rem;
      flex: none;
    }

    .stat-value {
      font: var(--mat-sys-headline-medium);
      line-height: 1.1;
    }

    .stat-label {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0.25rem;
    }

    .tone-primary .stat-icon {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .tone-success .stat-icon {
      background: color-mix(in srgb, #2e7d32 18%, transparent);
      color: #1b5e20;
    }

    .tone-warn .stat-icon {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    .tone-neutral .stat-icon {
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input.required<string>();
  readonly tone = input<'primary' | 'success' | 'warn' | 'neutral'>('primary');
}
