import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

export interface Personaje {
  id: string;
  name: string;
  role: string;
  difficulty: string;
  imageUrl: string;
}

export interface Transformation {
  id: string;
  name: string;
  icon: string;
  health: string | null;
  movement_speed: string | null;
}

export interface Costume {
  id: string;
  name: string;
  icon: string;
  quality: string;
  description: string;
  appearance: string;
}

export interface Ability {
  id: string;
  icon?: string;
  name?: string;
  type: string;
  isCollab: boolean;
  description?: string;
  additional_fields?: Record<string, string>;
  transformation_id: string;
}

export interface HeroDetail {
  id: string;
  name: string;
  real_name: string;
  imageUrl: string;
  role: string;
  attack_type: string;
  team: string[];
  difficulty: string;
  bio: string;
  lore: string;
  transformations: Transformation[];
  costumes: Costume[];
  abilities: Ability[];
}

@Injectable({
  providedIn: 'root',
})
export class PersonajeService {
  private apiUrl = `${environment.apiUrl}/personajes`;
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private _personajes = signal<Personaje[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly personajes = this._personajes.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  cargarPersonajes(): Observable<void> {
    this._isLoading.set(true);

    return this.http.get<{ success: boolean; personajes: Personaje[] }>(this.apiUrl).pipe(
      map(response => {
        if (response.success) {
          this._personajes.set(response.personajes);
        }
      }),
      map(() => void 0),
      catchError(error => this.handleError(error, 'Error al cargar personajes', void 0)),
      finalize(() => this._isLoading.set(false))
    );
  }

  getHeroDetail(id: string): Observable<HeroDetail> {
    const externalApiUrl = `https://marvelrivalsapi.com/api/v1/heroes/hero/${id}`;

    if (!environment.marvelRivalsApiKey) {
      throw new Error('No se puede hacer la petición.');
    }

    const headers = new HttpHeaders({
      'x-api-key': environment.marvelRivalsApiKey
    });

    return this.http.get<HeroDetail>(externalApiUrl, { headers });
  }

  private handleError<T>(error: any, defaultMessage: string, defaultValue: T): Observable<T> {
    const errorMessage = error.error?.message || defaultMessage;
    this._error.set(errorMessage);
    this.notificationService.error(errorMessage);
    return of(defaultValue);
  }
}
