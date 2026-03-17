import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioPersonajeService } from './usuario-personaje.service';
import { NotificationService } from './notification.service';
import { DatosInicialesService } from './datos-iniciales.service';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  active?: boolean;
  isPremium?: boolean;
  premiumUntil?: string | null;
}

interface AuthResponse {
  token: string;
  usuario: Usuario;
}

type PerfilUsuarioResponse = Omit<Usuario, 'id' | 'rol'>;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);
  private router = inject(Router);
  private usuarioPersonajeService = inject(UsuarioPersonajeService);
  private notificationService = inject(NotificationService);
  private datosInicialesService = inject(DatosInicialesService);

  private _usuario = signal<Usuario | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);
  private _token = signal<string | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._usuario());
  readonly isAdmin = computed(() => this._usuario()?.rol === 'admin');

  constructor() {
    const token = this.getTokenFromStorage();
    if (token) {
      this._token.set(token);
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado) {
        this._usuario.set(JSON.parse(usuarioGuardado));
        this.datosInicialesService.cargarTrasLogin().subscribe();
      }
    } else {
      this.usuarioPersonajeService.limpiarPersonajes();
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        this.setAuthData(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError(error => this.handleError(error, 'Error al iniciar sesión', {} as AuthResponse)),
      finalize(() => this._isLoading.set(false))
    );
  }

  register(email: string, password: string, nombre: string, apellido: string): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password, nombre, apellido }).pipe(
      tap(response => {
        this.setAuthData(response);
        this.router.navigate(['/dashboard']);
      }),
      catchError(error => this.handleError(error, 'Error al registrarse', {} as AuthResponse)),
      finalize(() => this._isLoading.set(false))
    );
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  setUsuario(usuario: Usuario): void {
    this._usuario.set(usuario);
    localStorage.setItem('usuario', JSON.stringify(usuario));
  }

  updateUsuario(data: Partial<Usuario>): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<{ success: boolean; message: string; usuario: PerfilUsuarioResponse }>(`${this.apiUrl}/me`, data).pipe(
      tap(response => {
        if (response.success) {
          const usuarioActual = this._usuario();
          if (!usuarioActual) {
            return;
          }

          this.setUsuario({
            ...usuarioActual,
            ...response.usuario,
          });
        }
      }),
      map(() => void 0),
      catchError(error => this.handleError(error, 'Error al actualizar el perfil', void 0)),
      finalize(() => this._isLoading.set(false))
    );
  }

  private setAuthData(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    this._token.set(response.token);
    this.setUsuario(response.usuario);
    this.datosInicialesService.cargarTrasLogin(true).subscribe();
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }

  private clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this._token.set(null);
    this._usuario.set(null);
    this.usuarioPersonajeService.limpiarPersonajes();
    this.datosInicialesService.reset();
  }

  private getTokenFromStorage(): string | null {
    return localStorage.getItem('token');
  }
}
