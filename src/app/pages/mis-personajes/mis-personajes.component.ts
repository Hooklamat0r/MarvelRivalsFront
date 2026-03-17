import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UsuarioPersonajeService } from '../../services/usuario-personaje.service';
import { PersonajeService, Personaje } from '../../services/personaje.service';
import { TeamUpService, TeamUp } from '../../services/teamup.service';
import { RoleService } from '../../services/role.service';
import { PersonajeCardComponent } from '../../components/personaje-card/personaje-card.component';

@Component({
  selector: 'app-mis-personajes',
  standalone: true,
  imports: [CommonModule, RouterLink, PersonajeCardComponent],
  templateUrl: './mis-personajes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisPersonajesComponent {
  private readonly usuarioPersonajeService = inject(UsuarioPersonajeService);
  private readonly personajeService = inject(PersonajeService);
  private readonly teamUpService = inject(TeamUpService);
  private readonly roleService = inject(RoleService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly personajes = this.usuarioPersonajeService.personajesSeleccionados;
  readonly totalPersonajes = this.usuarioPersonajeService.total;
  readonly isLoading = this.usuarioPersonajeService.isLoading;
  readonly validacion = this.usuarioPersonajeService.validacion;
  readonly todosLosPersonajes = this.personajeService.personajes;
  readonly todosLosTeamUps = this.teamUpService.teamUps;

  seleccionandoSugerido = signal<string | null>(null);
  confirmacionEliminarVisible = signal(false);
  personajeAEliminarId = signal<string | null>(null);
  personajeAEliminarNombre = signal('');
  eliminandoPersonaje = signal(false);

  readonly getRoleBadgeClass = (role: string) => this.roleService.getRoleBadgeClass(role);

  readonly personajesSugeridos = computed(() => {
    const validacion = this.validacion();
    const todosPersonajes = this.todosLosPersonajes();
    const personajesSeleccionados = this.personajes();

    if (!validacion || !validacion.errores.length || !todosPersonajes.length) {
      return [];
    }

    const idsSeleccionados = new Set(personajesSeleccionados.map(p => p.id));
    const sugerencias: Personaje[] = [];
    const maxSugerencias = 4;

    if (validacion.strategists < 2) {
      const strategistsDisponibles = todosPersonajes
        .filter(p => p.role === 'Strategist' && !idsSeleccionados.has(p.id));

      const strategistsASugerir = Math.min(maxSugerencias, strategistsDisponibles.length);
      sugerencias.push(...strategistsDisponibles.slice(0, strategistsASugerir));
    }

    if (validacion.vanguards < 1) {
      const vanguardsDisponibles = todosPersonajes
        .filter(p => p.role === 'Vanguard' && !idsSeleccionados.has(p.id));

      const espaciosDisponibles = maxSugerencias - sugerencias.length;
      if (espaciosDisponibles > 0) {
        const vanguardsASugerir = Math.min(espaciosDisponibles, vanguardsDisponibles.length);
        sugerencias.push(...vanguardsDisponibles.slice(0, vanguardsASugerir));
      }
    }

    if (validacion.total < 6 && sugerencias.length < maxSugerencias) {
      const espaciosRestantes = maxSugerencias - sugerencias.length;

      if (espaciosRestantes > 0) {
        const tieneStrategists = validacion.strategists >= 2;
        const tieneVanguards = validacion.vanguards >= 1;

        let personajesDisponibles = todosPersonajes
          .filter(p => !idsSeleccionados.has(p.id))
          .filter(p => !sugerencias.some(s => s.id === p.id));

        if (!tieneStrategists || !tieneVanguards) {
          const prioritarios = personajesDisponibles.filter(p =>
            p.role === 'Strategist' || p.role === 'Vanguard'
          );
          const otros = personajesDisponibles.filter(p =>
            p.role !== 'Strategist' && p.role !== 'Vanguard'
          );
          personajesDisponibles = [...prioritarios, ...otros];
        }

        sugerencias.push(...personajesDisponibles.slice(0, espaciosRestantes));
      }
    }

    return sugerencias.slice(0, maxSugerencias);
  });

  readonly teamUpsActivos = computed(() => {
    const personajesSeleccionados = this.personajes();
    const todosTeamUps = this.todosLosTeamUps();

    if (!personajesSeleccionados.length || !todosTeamUps.length) {
      return [];
    }

    const idsSeleccionados = new Set(personajesSeleccionados.map(p => p.id.toString()));

    return todosTeamUps.filter(teamUp => {
      const tienePersonaje1 = idsSeleccionados.has(teamUp.personaje1.id);
      const tienePersonaje2 = idsSeleccionados.has(teamUp.personaje2.id);
      return tienePersonaje1 && tienePersonaje2;
    });
  });

  readonly bonosPorPersonaje = computed(() => {
    const personajesSeleccionados = this.personajes();
    const teamUpsActivos = this.teamUpsActivos();

    const bonos: Record<string, { daño: number; curas: number; aguante: number }> = {};

    personajesSeleccionados.forEach(personaje => {
      bonos[personaje.id] = { daño: 0, curas: 0, aguante: 0 };

      teamUpsActivos.forEach(teamUp => {
        const personajeIdStr = personaje.id;
        const participa = teamUp.personaje1.id === personajeIdStr || teamUp.personaje2.id === personajeIdStr;

        if (participa) {
          const role = personaje.role;
          if (role === 'Duelist') {
            bonos[personaje.id].daño += 10;
          } else if (role === 'Strategist') {
            bonos[personaje.id].curas += 10;
          } else if (role === 'Vanguard') {
            bonos[personaje.id].aguante += 10;
          }
        }
      });
    });

    return bonos;
  });

  getBonoTexto(personajeId: string): string | null {
    const bonos = this.bonosPorPersonaje();
    const bono = bonos[personajeId];
    if (!bono) return null;

    const textos: string[] = [];
    if (bono.daño > 0) textos.push(`+${bono.daño}% Daño`);
    if (bono.curas > 0) textos.push(`+${bono.curas}% Curas`);
    if (bono.aguante > 0) textos.push(`+${bono.aguante}% Aguante`);

    return textos.length > 0 ? textos.join(', ') : null;
  }

  getTeamUpsPorPersonaje(personajeId: string): TeamUp[] {
    const personajeIdStr = personajeId;
    const teamUpsActivos = this.teamUpsActivos();

    return teamUpsActivos.filter(teamUp => {
      return teamUp.personaje1.id === personajeIdStr || teamUp.personaje2.id === personajeIdStr;
    });
  }

  seleccionarPersonajeSugerido(personaje: Personaje): void {
    if (this.seleccionandoSugerido() !== null) return;

    this.seleccionandoSugerido.set(personaje.id);

    this.usuarioPersonajeService.seleccionarPersonaje(personaje.id)
      .pipe(
        finalize(() => this.seleccionandoSugerido.set(null))
      )
      .subscribe();
  }

  deseleccionarPersonaje(personajeId: string, event?: Event): void {
    event?.stopPropagation();

    const personaje = this.personajes().find(p => p.id === personajeId);
    this.personajeAEliminarId.set(personajeId);
    this.personajeAEliminarNombre.set(personaje?.name || 'este personaje');
    this.confirmacionEliminarVisible.set(true);
  }

  cancelarEliminarPersonaje(): void {
    this.confirmacionEliminarVisible.set(false);
    this.personajeAEliminarId.set(null);
    this.personajeAEliminarNombre.set('');
  }

  confirmarEliminarPersonaje(): void {
    const personajeId = this.personajeAEliminarId();

    if (personajeId === null || this.eliminandoPersonaje()) {
      return;
    }

    this.eliminandoPersonaje.set(true);

    this.usuarioPersonajeService.deseleccionarPersonaje(personajeId)
      .pipe(finalize(() => this.eliminandoPersonaje.set(false)))
      .subscribe((response) => {
        if (response.success) {
          this.cancelarEliminarPersonaje();
        }
      });
  }

  volverAtras(): void {
    this.location.back();
  }

  viewPersonajeDetail(personaje: Personaje, event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    this.router.navigate(['/personajes', personaje.id]);
  }
}
