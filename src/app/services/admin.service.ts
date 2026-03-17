import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export interface UsuarioAdmin {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: string;
  active: boolean;
}

export interface PersonajeAdmin {
  id: string;
  name: string;
  role: string | null;
  difficulty: string | null;
  imageUrl: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private _usuarios = signal<UsuarioAdmin[]>([]);
  private _personajes = signal<PersonajeAdmin[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly usuarios = this._usuarios.asReadonly();
  readonly personajes = this._personajes.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  obtenerUsuarios(): Observable<UsuarioAdmin[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<{ success: boolean; usuarios: UsuarioAdmin[] }>(`${this.apiUrl}/usuarios`).pipe(
      map(response => {
        if (response.success) {
          this._usuarios.set(response.usuarios);
          return response.usuarios;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar usuarios', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  actualizarUsuario(id: number, data: Partial<UsuarioAdmin>): Observable<UsuarioAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<{ success: boolean; message: string; usuario: UsuarioAdmin }>(`${this.apiUrl}/usuarios/${id}`, data).pipe(
      map(response => {
        if (response.success) {
          this._usuarios.update(usuarios =>
            usuarios.map(u => u.id === id ? response.usuario : u)
          );
          this.notificationService.success(response.message);
          return response.usuario;
        }
        return {} as UsuarioAdmin;
      }),
      catchError(error => this.handleError(error, 'Error al actualizar usuario', {} as UsuarioAdmin)),
      finalize(() => this._isLoading.set(false))
    );
  }

  toggleUsuarioActive(id: number): Observable<UsuarioAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.patch<{ success: boolean; message: string; usuario: UsuarioAdmin }>(`${this.apiUrl}/usuarios/${id}/toggle-active`, {}).pipe(
      map(response => {
        if (response.success) {
          this._usuarios.update(usuarios =>
            usuarios.map(u => u.id === id ? response.usuario : u)
          );
          this.notificationService.success(response.message);
          return response.usuario;
        }
        return {} as UsuarioAdmin;
      }),
      catchError(error => this.handleError(error, 'Error al cambiar estado del usuario', {} as UsuarioAdmin)),
      finalize(() => this._isLoading.set(false))
    );
  }

  actualizarPersonaje(id: string, data: Partial<PersonajeAdmin>): Observable<PersonajeAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<{ success: boolean; message: string; personaje: PersonajeAdmin }>(`${this.apiUrl}/personajes/${id}`, data).pipe(
      map(response => {
        if (response.success) {
          this._personajes.update(personajes =>
            personajes.map(p => p.id === id ? response.personaje : p)
          );
          this.notificationService.success(response.message);
          return response.personaje;
        }
        return {} as PersonajeAdmin;
      }),
      catchError(error => this.handleError(error, 'Error al actualizar personaje', {} as PersonajeAdmin)),
      finalize(() => this._isLoading.set(false))
    );
  }

  eliminarPersonaje(id: string): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/personajes/${id}`).pipe(
      tap(response => {
        if (response.success) {
          this._personajes.update(personajes =>
            personajes.filter(p => p.id !== id)
          );
          this.notificationService.success(response.message);
        }
      }),
      map(() => void 0),
      catchError(error => this.handleError(error, 'Error al eliminar personaje', void 0)),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarPersonajes(): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<{ success: boolean; personajes: PersonajeAdmin[] }>(`${environment.apiUrl}/personajes`).pipe(
      tap(response => {
        if (response.success) {
          this._personajes.set(response.personajes);
        }
      }),
      map(() => void 0),
      catchError(error => this.handleError(error, 'Error al cargar personajes', void 0)),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.obtenerUsuarios();
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }
}
