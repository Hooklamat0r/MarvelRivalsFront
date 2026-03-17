import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  if (authService.token() && !authService.isLoggedIn()) {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      authService.setUsuario(JSON.parse(usuarioGuardado));
      return true;
    }
  }

  router.navigate(['/login']);
  return false;
};
