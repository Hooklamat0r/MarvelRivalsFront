import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, Usuario } from './auth.service';
import { NotificationService } from './notification.service';

interface PremiumStatusResponse {
  success: boolean;
  usuario: Usuario;
}

interface PremiumCompraResponse {
  success: boolean;
  message: string;
  pago: {
    id: number;
    plan: string;
    meses: number;
    precio: number;
    estado: string;
    createdAt: string;
    premiumUntil: string;
  };
  usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly apiUrl = `${environment.apiUrl}/premium`;
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  obtenerEstado(): Observable<PremiumStatusResponse> {
    return this.http.get<PremiumStatusResponse>(`${this.apiUrl}/estado`).pipe(
      tap(response => {
        if (response.success && response.usuario) {
          this.authService.setUsuario(response.usuario);
        }
      }),
      catchError(error => {
        this.notificationService.error(error.error?.message || 'Error al consultar premium');
        return of({ success: false, usuario: this.authService.usuario() as Usuario });
      })
    );
  }

  comprarPremium(meses: number): Observable<PremiumCompraResponse> {
    return this.http.post<PremiumCompraResponse>(`${this.apiUrl}/comprar`, { meses }).pipe(
      tap(response => {
        if (response.success && response.usuario) {
          this.authService.setUsuario(response.usuario);
          this.notificationService.success(response.message || 'Premium activado');
        }
      }),
      catchError(error => {
        this.notificationService.error(error.error?.message || 'Error al comprar premium');
        return of({
          success: false,
          message: 'Error al comprar premium',
          pago: {
            id: 0,
            plan: 'premium',
            meses: 0,
            precio: 0,
            estado: 'error',
            createdAt: '',
            premiumUntil: '',
          },
          usuario: this.authService.usuario() as Usuario,
        });
      })
    );
  }
}
