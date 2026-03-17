import { inject, Injector } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const token = localStorage.getItem('token');

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const authService = injector.get(AuthService);
        authService.logout();

        return throwError(
          () =>
            new HttpErrorResponse({
              headers: error.headers,
              status: error.status,
              statusText: error.statusText,
              url: error.url ?? undefined,
              redirected: error.redirected,
              error: {
                ...(typeof error.error === 'object' && error.error !== null ? error.error : {}),
                message: 'Tu sesión ha caducado',
              },
            })
        );
      }

      return throwError(() => error);
    })
  );
};
