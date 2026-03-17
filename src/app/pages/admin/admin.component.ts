import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, UsuarioAdmin, PersonajeAdmin } from '../../services/admin.service';
import { TeamUpService, TeamUp } from '../../services/teamup.service';
import { PersonajeService } from '../../services/personaje.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styles: [`
    select {
      background-color: rgb(30 41 59 / 0.9);
      color: white;
    }
    select option {
      background-color: rgb(30 41 59);
      color: white;
    }
  `]
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private teamUpService = inject(TeamUpService);
  private personajeService = inject(PersonajeService);
  private notificationService = inject(NotificationService);

  usuarios = this.adminService.usuarios;
  personajes = this.adminService.personajes;
  teamUps = this.teamUpService.teamUps;
  todosLosPersonajes = this.personajeService.personajes;
  isLoading = this.adminService.isLoading;

  activeTab = signal<'usuarios' | 'personajes' | 'teamups'>('usuarios');

  editingUsuarioId = signal<number | null>(null);
  editingPersonajeId = signal<string | null>(null);
  editingTeamUpId = signal<number | null>(null);

  usuarioForm = signal<Partial<UsuarioAdmin>>({});
  personajeForm = signal<Partial<PersonajeAdmin>>({});
  teamUpForm = signal<Partial<{ nombre: string; personaje1Id: string; personaje2Id: string; descripcion: string }>>({});

  ngOnInit(): void {
    this.adminService.cargarUsuarios().subscribe();
    this.adminService.cargarPersonajes().subscribe();
    this.teamUpService.cargarTeamUps().subscribe();
    this.personajeService.cargarPersonajes().subscribe();
  }

  switchTab(tab: 'usuarios' | 'personajes' | 'teamups'): void {
    this.activeTab.set(tab);
    this.cancelEdit();
  }

  onEditUsuario(usuario: UsuarioAdmin): void {
    this.editingUsuarioId.set(usuario.id);
    this.usuarioForm.set({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      active: usuario.active,
    });
  }

  onEditPersonaje(personaje: PersonajeAdmin): void {
    this.editingPersonajeId.set(personaje.id);
    this.personajeForm.set({
      name: personaje.name,
      role: personaje.role || '',
      difficulty: personaje.difficulty || '',
      imageUrl: personaje.imageUrl || '',
    });
  }

  cancelEdit(): void {
    this.editingUsuarioId.set(null);
    this.editingPersonajeId.set(null);
    this.editingTeamUpId.set(null);
    this.usuarioForm.set({});
    this.personajeForm.set({});
    this.teamUpForm.set({});
  }

  onSaveUsuario(id: number): void {
    const form = this.usuarioForm();
    if (!form.nombre || !form.apellido || !form.email) {
      this.notificationService.error('Nombre, apellido y email son requeridos');
      return;
    }

    this.adminService.actualizarUsuario(id, form).subscribe({
      next: () => this.cancelEdit()
    });
  }

  onToggleUsuarioActive(id: number): void {
    this.adminService.toggleUsuarioActive(id).subscribe();
  }

  onSavePersonaje(): void {
    const form = this.personajeForm();
    const editingId = this.editingPersonajeId();

    if (!editingId || editingId === 'new') return;

    if (!form.name) {
      this.notificationService.error('El nombre es requerido');
      return;
    }

    this.adminService.actualizarPersonaje(editingId, {
      name: form.name,
      role: form.role || null,
      difficulty: form.difficulty || null,
      imageUrl: form.imageUrl || null,
    }).subscribe(() => this.cancelEdit());
  }

  onDeletePersonaje(id: string, name: string): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar el personaje "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.adminService.eliminarPersonaje(id).subscribe();
  }

  onCreateTeamUp(): void {
    this.editingTeamUpId.set(-1);
    this.teamUpForm.set({
      nombre: '',
      personaje1Id: '',
      personaje2Id: '',
      descripcion: '',
    });
  }

  onEditTeamUp(teamUp: TeamUp): void {
    this.editingTeamUpId.set(teamUp.id);
    this.teamUpForm.set({
      nombre: teamUp.nombre,
      personaje1Id: teamUp.personaje1.id,
      personaje2Id: teamUp.personaje2.id,
      descripcion: teamUp.descripcion,
    });
  }

  onSaveTeamUp(): void {
    const form = this.teamUpForm();
    const editingId = this.editingTeamUpId();

    if (!editingId) return;

    if (!form.nombre || !form.personaje1Id || !form.personaje2Id || !form.descripcion) {
      this.notificationService.error('Todos los campos son requeridos');
      return;
    }

    if (form.personaje1Id === form.personaje2Id) {
      this.notificationService.error('Un personaje no puede tener TeamUp consigo mismo');
      return;
    }

    if (editingId === -1) {
      this.teamUpService.crearTeamUp({
        nombre: form.nombre!,
        personaje1Id: form.personaje1Id!,
        personaje2Id: form.personaje2Id!,
        descripcion: form.descripcion!,
      }).subscribe({
        next: () => {
          this.cancelEdit();
          this.teamUpService.cargarTeamUps();
        }
      });
    } else {
      this.teamUpService.actualizarTeamUp(editingId, {
        nombre: form.nombre,
        personaje1Id: form.personaje1Id,
        personaje2Id: form.personaje2Id,
        descripcion: form.descripcion,
      }).subscribe(() => this.cancelEdit());
    }
  }

  onDeleteTeamUp(id: number, nombre: string): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar el TeamUp "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.teamUpService.eliminarTeamUp(id).subscribe();
  }

  getRoleBadgeClass(rol: string): string {
    return rol === 'admin' 
      ? 'bg-red-900/20 text-red-300 border-red-500/30' 
      : 'bg-blue-900/20 text-blue-300 border-blue-500/30';
  }
}
