import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export interface AmistadUsuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface RelacionMeta {
  id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  rolActual: 'solicitante' | 'receptor';
}

export interface UsuarioBusquedaAmigo extends AmistadUsuario {
  relacion: RelacionMeta | null;
  isPremium?: boolean;
}

export interface SolicitudAmistad {
  id: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  solicitante: AmistadUsuario;
  receptor: AmistadUsuario;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
}

export interface AmigoActivo {
  amistadId: number;
  usuario: AmistadUsuario;
  estado: 'aceptada';
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  total: number;
  amigos?: AmigoActivo[];
  solicitudes?: SolicitudAmistad[];
  usuarios?: UsuarioBusquedaAmigo[];
}

interface ActionResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AmistadService {
  private readonly apiUrl = `${environment.apiUrl}/amigos`;
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly _amigos = signal<AmigoActivo[]>([]);
  private readonly _solicitudesRecibidas = signal<SolicitudAmistad[]>([]);
  private readonly _solicitudesEnviadas = signal<SolicitudAmistad[]>([]);
  private readonly _usuariosBusqueda = signal<UsuarioBusquedaAmigo[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly amigos = this._amigos.asReadonly();
  readonly solicitudesRecibidas = this._solicitudesRecibidas.asReadonly();
  readonly solicitudesEnviadas = this._solicitudesEnviadas.asReadonly();
  readonly usuariosBusqueda = this._usuariosBusqueda.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  cargarAmigos(): Observable<AmigoActivo[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ListResponse>(this.apiUrl).pipe(
      map(response => {
        const amigos = response.success && response.amigos ? response.amigos : [];
        this._amigos.set(amigos);
        return amigos;
      }),
      catchError(error => this.handleError(error, 'Error al cargar amigos', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarSolicitudesRecibidas(): Observable<SolicitudAmistad[]> {
    return this.http.get<ListResponse>(`${this.apiUrl}/solicitudes-recibidas`).pipe(
      map(response => {
        const solicitudes = response.success && response.solicitudes ? response.solicitudes : [];
        this._solicitudesRecibidas.set(solicitudes);
        return solicitudes;
      }),
      catchError(error => this.handleError(error, 'Error al cargar solicitudes recibidas', []))
    );
  }

  cargarSolicitudesEnviadas(): Observable<SolicitudAmistad[]> {
    return this.http.get<ListResponse>(`${this.apiUrl}/solicitudes-enviadas`).pipe(
      map(response => {
        const solicitudes = response.success && response.solicitudes ? response.solicitudes : [];
        this._solicitudesEnviadas.set(solicitudes);
        return solicitudes;
      }),
      catchError(error => this.handleError(error, 'Error al cargar solicitudes enviadas', []))
    );
  }

  buscarUsuarios(query: string): Observable<UsuarioBusquedaAmigo[]> {
    const q = query.trim();

    if (!q) {
      this._usuariosBusqueda.set([]);
      return of([]);
    }

    return this.http.get<ListResponse>(`${this.apiUrl}/buscar`, { params: { q } }).pipe(
      map(response => {
        const usuarios = response.success && response.usuarios ? response.usuarios : [];
        this._usuariosBusqueda.set(usuarios);
        return usuarios;
      }),
      catchError(error => this.handleError(error, 'Error al buscar usuarios', []))
    );
  }

  limpiarResultadosBusqueda(): void {
    this._usuariosBusqueda.set([]);
  }

  enviarSolicitud(usuarioId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/${usuarioId}/solicitar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Solicitud enviada');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al enviar solicitud', { success: false, message: 'Error al enviar solicitud' }))
    );
  }

  aceptarSolicitud(solicitudId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/solicitudes/${solicitudId}/aceptar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Solicitud aceptada');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al aceptar solicitud', { success: false, message: 'Error al aceptar solicitud' }))
    );
  }

  rechazarSolicitud(solicitudId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/solicitudes/${solicitudId}/rechazar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Solicitud rechazada');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al rechazar solicitud', { success: false, message: 'Error al rechazar solicitud' }))
    );
  }

  eliminarAmigo(amigoId: number): Observable<ActionResponse> {
    return this.http.delete<ActionResponse>(`${this.apiUrl}/${amigoId}`).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Amistad eliminada');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al eliminar amistad', { success: false, message: 'Error al eliminar amistad' }))
    );
  }

  recargarListas(): void {
    this.cargarAmigos().subscribe();
    this.cargarSolicitudesRecibidas().subscribe();
    this.cargarSolicitudesEnviadas().subscribe();
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const message = error.error?.message || defaultMessage;
    this._error.set(message);
    this.notificationService.error(message);
    return of(defaultValue);
  }
}
