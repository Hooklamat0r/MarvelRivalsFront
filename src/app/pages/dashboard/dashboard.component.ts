import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsuarioPersonajeService } from '../../services/usuario-personaje.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private usuarioPersonajeService = inject(UsuarioPersonajeService);

  readonly personajesSeleccionados = this.usuarioPersonajeService.personajesSeleccionados;
  readonly totalPersonajes = this.usuarioPersonajeService.total;
  readonly isLoading = this.usuarioPersonajeService.isLoading;

  readonly misPersonajes = computed(() =>
    this.personajesSeleccionados().slice(0, 3)
  );

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
