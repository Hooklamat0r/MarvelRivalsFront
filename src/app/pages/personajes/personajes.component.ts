import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PersonajeService, Personaje } from '../../services/personaje.service';
import { UsuarioPersonajeService } from '../../services/usuario-personaje.service';
import { RoleService } from '../../services/role.service';
import { NotificationService } from '../../services/notification.service';
import { PersonajeCardComponent } from '../../components/personaje-card/personaje-card.component';

@Component({
  selector: 'app-personajes',
  standalone: true,
  imports: [CommonModule, PersonajeCardComponent],
  templateUrl: './personajes.component.html',
})
export class PersonajesComponent implements OnInit {
  private personajeService = inject(PersonajeService);
  private usuarioPersonajeService = inject(UsuarioPersonajeService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  private location = inject(Location);
  private notificationService = inject(NotificationService);

  personajes = this.personajeService.personajes;
  isLoading = this.personajeService.isLoading;
  error = this.personajeService.error;

  selectedRol = signal<string>('');
  selectedDifficulty = signal<string>('');
  searchTerm = signal<string>('');

  seleccionandoId = signal<string | null>(null);

  readonly getRoleBadgeClass = (role: string) => this.roleService.getRoleBadgeClass(role);

  rolesDisponibles = computed(() => {
    return this.roleService.getUniqueRoles(this.personajes());
  });

  dificultadesDisponibles = computed(() => {
    const personajes = this.personajes();
    const dificultades = new Set(personajes.map(p => p.difficulty));
    return Array.from(dificultades).sort();
  });

  personajesFiltrados = computed(() => {
    let filtered = this.personajes();

    if (this.selectedRol()) {
      filtered = filtered.filter(p => p.role === this.selectedRol());
    }

    if (this.selectedDifficulty()) {
      filtered = filtered.filter(p => p.difficulty === this.selectedDifficulty());
    }

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    }

    return filtered;
  });

  ngOnInit(): void {
    this.personajeService.cargarPersonajes().subscribe();
  }

  onFilterRol(rol: string): void {
    this.selectedRol.set(rol === this.selectedRol() ? '' : rol);
  }

  onFilterDifficulty(difficulty: string): void {
    this.selectedDifficulty.set(difficulty === this.selectedDifficulty() ? '' : difficulty);
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  clearFilters(): void {
    this.selectedRol.set('');
    this.selectedDifficulty.set('');
    this.searchTerm.set('');
  }

  irAMisPersonajes(): void {
    this.router.navigate(['/mis-personajes']);
  }

  volverAtras(): void {
    this.location.back();
  }

  selectPersonaje(personaje: Personaje): void {
    if (this.isSelected(personaje.id)) return;

    this.seleccionandoId.set(personaje.id);

    this.usuarioPersonajeService.seleccionarPersonaje(personaje.id)
      .pipe(
        finalize(() => this.seleccionandoId.set(null))
      )
      .subscribe((response) => {
        if (response.success) {
          this.notificationService.success(`¡${personaje.name} seleccionado correctamente!`);
        }
      });
  }

  deseleccionarPersonaje(personajeId: string, event: Event): void {
    event.stopPropagation();

    this.seleccionandoId.set(personajeId);
    const personaje = this.personajes().find(p => p.id === personajeId);

    this.usuarioPersonajeService.deseleccionarPersonaje(personajeId)
      .pipe(
        finalize(() => this.seleccionandoId.set(null))
      )
      .subscribe((response) => {
        if (response.success && personaje) {
          this.notificationService.error(`¡${personaje.name} eliminado de tus seleccionados!`);
        }
      });
  }

  isSelected(personajeId: string): boolean {
    return this.usuarioPersonajeService.estaSeleccionado(personajeId);
  }

  viewPersonajeDetail(personaje: Personaje, event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    this.router.navigate(['/personajes', personaje.id]);
  }
}
