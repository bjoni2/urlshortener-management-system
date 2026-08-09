import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { UrlStatus } from '../core/models/api.models';

@Component({
  selector: 'app-url-status-chip',
  imports: [MatChipsModule, MatIconModule],
  template: `
    <mat-chip-set>
      <mat-chip class="status-{{ status().toLowerCase() }}" disableRipple>
        <mat-icon matChipAvatar>{{ icon() }}</mat-icon>
        {{ label() }}
      </mat-chip>
    </mat-chip-set>
  `,
  styles: `
    .status-active {
      --mdc-chip-elevated-container-color: color-mix(in srgb, #2e7d32 15%, transparent);
      --mdc-chip-label-text-color: #1b5e20;
    }
    .status-inactive {
      --mdc-chip-elevated-container-color: var(--mat-sys-surface-container-highest);
      --mdc-chip-label-text-color: var(--mat-sys-on-surface-variant);
    }
    .status-expired {
      --mdc-chip-elevated-container-color: var(--mat-sys-error-container);
      --mdc-chip-label-text-color: var(--mat-sys-on-error-container);
    }
  `,
})
export class UrlStatusChipComponent {
  readonly status = input.required<UrlStatus>();

  protected readonly label = computed(() => {
    switch (this.status()) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      default:
        return 'Expired';
    }
  });

  protected readonly icon = computed(() => {
    switch (this.status()) {
      case 'ACTIVE':
        return 'check_circle';
      case 'INACTIVE':
        return 'pause_circle';
      default:
        return 'schedule';
    }
  });
}
