import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { UserResponse } from '../core/models/api.models';
import { ShellComponent } from './shell.component';

const JANE: UserResponse = {
  id: 'user-1',
  email: 'jane@example.com',
  role: 'USER',
  enabled: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let loggedOut: number;
  let navigated: unknown[][];

  async function setUp(role: 'USER' | 'ADMIN') {
    loggedOut = 0;
    navigated = [];
    TestBed.resetTestingModule();

    const user = signal<UserResponse>({ ...JANE, role });
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user,
            isAdmin: () => role === 'ADMIN',
            isAuthenticated: () => true,
            logout: () => loggedOut++,
          },
        },
      ],
    }).compileComponents();

    TestBed.inject(Router).navigate = ((commands: unknown[]) => {
      navigated.push(commands);
      return Promise.resolve(true);
    }) as Router['navigate'];

    fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the standard navigation and the signed-in email', async () => {
    const element = await setUp('USER');

    const links = [...element.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(links).toEqual(['Dashboard', 'My URLs']);
    expect(element.textContent).toContain('jane@example.com');
  });

  it('hides the administration links from a standard user', async () => {
    const element = await setUp('USER');

    expect(element.textContent).not.toContain('All URLs');
  });

  it('adds the administration links for an administrator', async () => {
    const element = await setUp('ADMIN');

    const links = [...element.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(links).toEqual(['Dashboard', 'My URLs', 'Users', 'All URLs']);
  });

  it('ends the session and returns to the login page on sign-out', async () => {
    await setUp('USER');

    (fixture.componentInstance as unknown as { signOut(): void }).signOut();

    expect(loggedOut).toBe(1);
    expect(navigated).toEqual([['/login']]);
  });

  it('renders the outlet the feature pages appear in', async () => {
    const element = await setUp('USER');

    expect(element.querySelector('.shell-content')).not.toBeNull();
  });
});
