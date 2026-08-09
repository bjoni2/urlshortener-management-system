import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · URL Shortener',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account · URL Shortener',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard · URL Shortener',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'urls',
        title: 'My URLs · URL Shortener',
        loadComponent: () => import('./features/urls/url-list.component').then((m) => m.UrlListComponent),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        title: 'Users · URL Shortener',
        loadComponent: () =>
          import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'admin/urls',
        canActivate: [adminGuard],
        title: 'All URLs · URL Shortener',
        loadComponent: () => import('./features/admin/admin-urls.component').then((m) => m.AdminUrlsComponent),
      },
    ],
  },
  {
    path: '**',
    title: 'Not found · URL Shortener',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];
