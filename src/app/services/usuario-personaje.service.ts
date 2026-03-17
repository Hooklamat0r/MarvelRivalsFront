import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, finalize, switchMap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export interface PersonajeSeleccionado {
  id: string;
  name: string;
  role: string;
  difficulty: string;
  imageUrl: string;
  seleccionadoEn: string;
}

interface ValidacionEquipo {
  valido: boolean;
  total: number;
  strategists: number;
  vanguards: number;
  errores: string[];
  advertencias: string[];
}

interface MisPersonajesResponse {
  success: boolean;
  personajes: PersonajeSeleccionado[];
  total: number;
  validacion?: ValidacionEquipo;
}

interface SeleccionResponse {
  success: boolean;
  message: string;
  personaje?: {
    id: string;
    name: string;
    role: string;
  };
  validacion?: ValidacionEquipo;
}

@Injectable({
  providedIn: 'root',
})
export class UsuarioPersonajeService {
  private apiUrl = `${environment.apiUrl}/usuario-personajes`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private _personajesSeleccionados = signal<PersonajeSeleccionado[]>([]);
  private _total = signal<number>(0);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  private _validacion = signal<ValidacionEquipo | null>(null);

  readonly personajesSeleccionados = this._personajesSeleccionados.asReadonly();
  readonly total = this._total.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly validacion = this._validacion.asReadonly();

  readonly totalPersonajes = computed(() => this._personajesSeleccionados().length);

  limpiarPersonajes(): void {
    this._personajesSeleccionados.set([]);
    this._total.set(0);
    this._error.set(null);
  }

  seleccionarPersonaje(personajeId: string): Observable<SeleccionResponse> {
    return this.http.post<SeleccionResponse>(`${this.apiUrl}/seleccionar`, { personajeId }).pipe(
      tap(response => {
        if (response.validacion) {
          this._validacion.set(response.validacion);
        }
      }),
      switchMap(response =>
        this.obtenerPersonajesSeleccionados().pipe(
          map(() => response)
        )
      ),
      catchError(error => this.handleError(error, 'Error al seleccionar personaje', {
        success: false,
        message: 'Error al seleccionar personaje'
      } as SeleccionResponse))
    );
  }

  deseleccionarPersonaje(personajeId: string): Observable<SeleccionResponse> {
    return this.http.post<SeleccionResponse>(`${this.apiUrl}/deseleccionar`, { personajeId }).pipe(
      switchMap(() =>
        this.obtenerPersonajesSeleccionados().pipe(
          map(() => ({ success: true, message: 'Personaje deseleccionado correctamente' } as SeleccionResponse))
        )
      ),
      catchError(error => this.handleError(error, 'Error al deseleccionar personaje', {
        success: false,
        message: 'Error al deseleccionar personaje'
      } as SeleccionResponse))
    );
  }

  obtenerPersonajesSeleccionados(): Observable<MisPersonajesResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<MisPersonajesResponse>(`${this.apiUrl}/mis-personajes`).pipe(
      tap(response => {
        this._personajesSeleccionados.set(response.personajes);
        this._total.set(response.total);
        if (response.validacion) {
          this._validacion.set(response.validacion);
        }
      }),
      catchError(error => this.handleError(error, 'Error al cargar personajes seleccionados', {
        success: false,
        personajes: [],
        total: 0
      } as MisPersonajesResponse)),
      finalize(() => this._isLoading.set(false))
    );
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }

  estaSeleccionado(personajeId: string): boolean {
    return this._personajesSeleccionados().some(p => p.id === personajeId);
  }
}
