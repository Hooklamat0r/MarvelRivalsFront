import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { UsuarioPersonajeService } from './usuario-personaje.service';
import { PersonajeService } from './personaje.service';
import { TeamUpService } from './teamup.service';

@Injectable({
  providedIn: 'root',
})
export class DatosInicialesService {
  private readonly usuarioPersonajeService = inject(UsuarioPersonajeService);
  private readonly personajeService = inject(PersonajeService);
  private readonly teamUpService = inject(TeamUpService);

  private _cargados = signal<boolean>(false);

  cargarTrasLogin(forzar = false): Observable<void> {
    if (this._cargados() && !forzar) {
      return of(void 0);
    }

    return forkJoin([
      this.usuarioPersonajeService.obtenerPersonajesSeleccionados(),
      this.personajeService.cargarPersonajes(),
      this.teamUpService.cargarTeamUps(),
    ]).pipe(
      tap(() => this._cargados.set(true)),
      catchError(() => of(null)),
      map(() => void 0)
    );
  }

  reset(): void {
    this._cargados.set(false);
  }
}
