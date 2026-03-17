import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export interface TeamUp {
  id: number;
  nombre: string;
  personaje1: {
    id: string;
    name: string;
    role: string | null;
  };
  personaje2: {
    id: string;
    name: string;
    role: string | null;
  };
  descripcion: string;
}

interface TeamUpsResponse {
  success: boolean;
  teamups: TeamUp[];
}

interface TeamUpResponse {
  success: boolean;
  message?: string;
  teamup: TeamUp;
}

@Injectable({
  providedIn: 'root',
})
export class TeamUpService {
  private apiUrl = `${environment.apiUrl}/teamups`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private _teamUps = signal<TeamUp[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly teamUps = this._teamUps.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  cargarTeamUps(): Observable<TeamUp[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<TeamUpsResponse>(this.apiUrl).pipe(
      map(response => {
        if (response.success) {
          this._teamUps.set(response.teamups);
          return response.teamups;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar TeamUps', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  obtenerTeamUpsPorPersonaje(personajeId: string): Observable<TeamUp[]> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<TeamUpsResponse>(`${this.apiUrl}/personaje/${personajeId}`).pipe(
      map(response => {
        if (response.success) {
          return response.teamups;
        }
        return [];
      }),
      catchError(error => this.handleError(error, 'Error al cargar TeamUps del personaje', [])),
      finalize(() => this._isLoading.set(false))
    );
  }

  crearTeamUp(data: {
    nombre: string;
    personaje1Id: string;
    personaje2Id: string;
    descripcion: string;
  }): Observable<TeamUp> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<TeamUpResponse>(this.apiUrl, data).pipe(
      map(response => {
        if (response.success) {
          this._teamUps.update(teamUps => [...teamUps, response.teamup]);
          this.notificationService.success(response.message || 'TeamUp creado correctamente');
          return response.teamup;
        }
        return {} as TeamUp;
      }),
      catchError(error => this.handleError(error, 'Error al crear TeamUp', {} as TeamUp)),
      finalize(() => this._isLoading.set(false))
    );
  }

  actualizarTeamUp(
    id: number,
    data: Partial<{
      nombre: string;
      personaje1Id: string;
      personaje2Id: string;
      descripcion: string;
    }>
  ): Observable<TeamUp> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.put<TeamUpResponse>(`${this.apiUrl}/${id}`, data).pipe(
      map(response => {
        if (response.success) {
          this._teamUps.update(teamUps =>
            teamUps.map(tu => tu.id === id ? response.teamup : tu)
          );
          this.notificationService.success(response.message || 'TeamUp actualizado correctamente');
          return response.teamup;
        }
        return {} as TeamUp;
      }),
      catchError(error => this.handleError(error, 'Error al actualizar TeamUp', {} as TeamUp)),
      finalize(() => this._isLoading.set(false))
    );
  }

  eliminarTeamUp(id: number): Observable<void> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(response => {
        if (response.success) {
          this._teamUps.update(teamUps => teamUps.filter(tu => tu.id !== id));
          this.notificationService.success(response.message || 'TeamUp eliminado correctamente');
        }
      }),
      map(() => void 0),
      catchError(error => this.handleError(error, 'Error al eliminar TeamUp', void 0)),
      finalize(() => this._isLoading.set(false))
    );
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }
}
