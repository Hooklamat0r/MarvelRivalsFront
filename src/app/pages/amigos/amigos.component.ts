import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AmistadService, AmigoActivo, SolicitudAmistad, UsuarioBusquedaAmigo } from '../../services/amistad.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-amigos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './amigos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmigosComponent implements OnInit {
  private readonly amistadService = inject(AmistadService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.amistadService.isLoading;
  readonly amigos = this.amistadService.amigos;
  readonly solicitudesRecibidas = this.amistadService.solicitudesRecibidas;
  readonly solicitudesEnviadas = this.amistadService.solicitudesEnviadas;
  readonly usuariosBusqueda = this.amistadService.usuariosBusqueda;

  readonly totalPendientes = computed(() => this.solicitudesRecibidas().length + this.solicitudesEnviadas().length);
  readonly esPremium = computed(() => !!this.authService.usuario()?.isPremium);

  readonly query = signal('');
  readonly buscando = signal(false);
  readonly accionandoId = signal<number | null>(null);
  readonly busquedaRealizada = signal(false);

  ngOnInit(): void {
    if (!this.esPremium()) {
      return;
    }

    this.recargar();
  }

  recargar(): void {
    if (!this.esPremium()) {
      return;
    }

    this.amistadService.recargarListas();
  }

  buscar(): void {
    if (!this.esPremium()) {
      return;
    }

    const query = this.query().trim();
    if (!query) {
      this.busquedaRealizada.set(false);
      this.amistadService.limpiarResultadosBusqueda();
      return;
    }

    this.busquedaRealizada.set(true);
    this.buscando.set(true);
    this.amistadService.buscarUsuarios(query).pipe(finalize(() => this.buscando.set(false))).subscribe();
  }

  limpiarBusqueda(): void {
    if (!this.esPremium()) {
      return;
    }

    this.query.set('');
    this.busquedaRealizada.set(false);
    this.amistadService.limpiarResultadosBusqueda();
  }

  enviarSolicitud(usuario: UsuarioBusquedaAmigo): void {
    if (!this.esPremium()) {
      return;
    }

    this.accionandoId.set(usuario.id);
    this.amistadService.enviarSolicitud(usuario.id)
      .pipe(
        finalize(() => this.accionandoId.set(null))
      )
      .subscribe();
  }

  aceptarSolicitud(solicitud: SolicitudAmistad): void {
    if (!this.esPremium()) {
      return;
    }

    this.accionandoId.set(solicitud.id);
    this.amistadService.aceptarSolicitud(solicitud.id).pipe(finalize(() => this.accionandoId.set(null))).subscribe();
  }

  rechazarSolicitud(solicitud: SolicitudAmistad): void {
    if (!this.esPremium()) {
      return;
    }

    this.accionandoId.set(solicitud.id);
    this.amistadService.rechazarSolicitud(solicitud.id).pipe(finalize(() => this.accionandoId.set(null))).subscribe();
  }

  eliminarAmigo(amigo: AmigoActivo): void {
    if (!this.esPremium()) {
      return;
    }

    this.accionandoId.set(amigo.usuario.id);
    this.amistadService.eliminarAmigo(amigo.usuario.id).pipe(finalize(() => this.accionandoId.set(null))).subscribe();
  }

  puedeEnviarSolicitud(usuario: UsuarioBusquedaAmigo): boolean {
    return !usuario.relacion && usuario.isPremium !== false;
  }

  esUsuarioNoPremium(usuario: UsuarioBusquedaAmigo): boolean {
    return usuario.isPremium === false;
  }
}
