import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, finalize, map, switchMap, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export type EstadoPartida = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada' | 'resuelta';

export interface PartidaUsuario {
  id: number;
  nombre: string;
  apellido: string;
}

export interface PartidaEquipoPersonaje {
  id: string;
  name: string;
  role: string | null;
  imageUrl: string | null;
  difficulty: string | null;
}

export interface PartidaDetalleEquipo {
  puntuacion: number;
  bonusRoles: number;
  bonusComposicion: number;
  bonusDiversidad: number;
  bonusTeamUps: number;
  factorMomento: number;
  roleCount: {
    Strategist: number;
    Vanguard: number;
    Duelist: number;
  };
}

export interface PartidaDetalleResultado {
  retador: PartidaDetalleEquipo | null;
  retado: PartidaDetalleEquipo | null;
}

export interface Partida {
  id: number;
  estado: EstadoPartida;
  tipoReto: 'aleatoria' | 'amigo';
  retador: PartidaUsuario;
  retado: PartidaUsuario;
  ganador: PartidaUsuario | null;
  equipoRetador: PartidaEquipoPersonaje[] | null;
  equipoRetado: PartidaEquipoPersonaje[] | null;
  puntuacionRetador: number | null;
  puntuacionRetado: number | null;
  detalleResultado: PartidaDetalleResultado;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
}

export interface UsuarioDisponible {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface ListResponse {
  success: boolean;
  total: number;
  partidas?: Partida[];
  usuarios?: UsuarioDisponible[];
  premium?: boolean;
}

interface ActionResponse {
  success: boolean;
  message: string;
  partida: Partida;
}

@Injectable({
  providedIn: 'root',
})
export class PartidaService {
  private apiUrl = `${environment.apiUrl}/partidas`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private _pendientesRecibidas = signal<Partida[]>([]);
  private _pendientesEnviadas = signal<Partida[]>([]);
  private _historial = signal<Partida[]>([]);
  private _usuariosDisponibles = signal<UsuarioDisponible[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly pendientesRecibidas = this._pendientesRecibidas.asReadonly();
  readonly pendientesEnviadas = this._pendientesEnviadas.asReadonly();
  readonly historial = this._historial.asReadonly();
  readonly usuariosDisponibles = this._usuariosDisponibles.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  cargarUsuariosDisponibles(): Observable<UsuarioDisponible[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ListResponse>(`${this.apiUrl}/usuarios-disponibles`).pipe(
      map(response => {
        if (response.success && response.usuarios) {
          this._usuariosDisponibles.set(response.usuarios);
          return response.usuarios;
        }
        this._usuariosDisponibles.set([]);
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar usuarios disponibles', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarPendientesRecibidas(): Observable<Partida[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ListResponse>(`${this.apiUrl}/pendientes-recibidas`).pipe(
      map(response => {
        if (response.success && response.partidas) {
          this._pendientesRecibidas.set(response.partidas);
          return response.partidas;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar retos recibidos', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarPendientesEnviadas(): Observable<Partida[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ListResponse>(`${this.apiUrl}/pendientes-enviadas`).pipe(
      map(response => {
        if (response.success && response.partidas) {
          this._pendientesEnviadas.set(response.partidas);
          return response.partidas;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar retos enviados', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  cargarHistorial(): Observable<Partida[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<ListResponse>(`${this.apiUrl}/historial`).pipe(
      map(response => {
        if (response.success && response.partidas) {
          this._historial.set(response.partidas);
          return response.partidas;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar historial', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  crearReto(retadoId?: number | null): Observable<ActionResponse> {
    const payload = retadoId ? { retadoId } : {};
    const delayBusquedaMs = retadoId ? 0 : 1400;

    return timer(delayBusquedaMs).pipe(
      switchMap(() => this.http.post<ActionResponse>(`${this.apiUrl}/retar`, payload)),
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Reto creado correctamente');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al crear reto', {
        success: false,
        message: 'Error al crear reto',
        partida: {} as Partida,
      }))
    );
  }

  aceptarReto(partidaId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/${partidaId}/aceptar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Reto aceptado');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al aceptar reto', {
        success: false,
        message: 'Error al aceptar reto',
        partida: {} as Partida,
      }))
    );
  }

  rechazarReto(partidaId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/${partidaId}/rechazar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Reto rechazado');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al rechazar reto', {
        success: false,
        message: 'Error al rechazar reto',
        partida: {} as Partida,
      }))
    );
  }

  cancelarReto(partidaId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/${partidaId}/cancelar`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.notificationService.success(response.message || 'Reto cancelado');
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al cancelar reto', {
        success: false,
        message: 'Error al cancelar reto',
        partida: {} as Partida,
      }))
    );
  }

  resolverPartida(partidaId: number): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`${this.apiUrl}/${partidaId}/resolver`, {}).pipe(
      tap(response => {
        if (response.success) {
          this.recargarListas();
        }
      }),
      catchError(error => this.handleError(error, 'Error al resolver partida', {
        success: false,
        message: 'Error al resolver partida',
        partida: {} as Partida,
      }))
    );
  }

  recargarListas(): void {
    this.cargarPendientesRecibidas().subscribe();
    this.cargarPendientesEnviadas().subscribe();
    this.cargarHistorial().subscribe();
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }
}
