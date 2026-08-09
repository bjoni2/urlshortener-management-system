import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="not-found">
      <mat-icon class="not-found-icon">travel_explore</mat-icon>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has been moved.</p>
      <a matButton="filled" routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
  styles: `
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      min-height: 70dvh;
      text-align: center;
      padding: 2rem;
    }

    .not-found-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: var(--mat-sys-on-surface-variant);
    }

    h1 {
      font: var(--mat-sys-headline-small);
      margin: 0;
    }

    p {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 1rem;
    }
  `,
})
export class NotFoundComponent {}
