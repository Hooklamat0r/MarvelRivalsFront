import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { PartidaService, Partida, PartidaEquipoPersonaje } from '../../services/partida.service';
import { UsuarioPersonajeService } from '../../services/usuario-personaje.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-partidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partidas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartidasComponent implements OnInit, OnDestroy {
  private readonly partidaService = inject(PartidaService);
  private readonly usuarioPersonajeService = inject(UsuarioPersonajeService);
  private readonly authService = inject(AuthService);
  private readonly location = inject(Location);

  readonly isLoading = this.partidaService.isLoading;
  readonly usuariosDisponibles = this.partidaService.usuariosDisponibles;
  readonly pendientesRecibidas = this.partidaService.pendientesRecibidas;
  readonly pendientesEnviadas = this.partidaService.pendientesEnviadas;
  readonly historial = this.partidaService.historial;
  readonly validacionEquipo = this.usuarioPersonajeService.validacion;
  readonly usuario = this.authService.usuario;

  readonly puedeCrearPartida = computed(() => !!this.validacionEquipo()?.valido);
  readonly esPremium = computed(() => !!this.usuario()?.isPremium);

  rivalSeleccionadoId = signal<number | null>(null);
  creandoReto = signal(false);
  accionandoPartidaId = signal<number | null>(null);
  animacionVisible = signal(false);
  animacionFase = signal<'intro' | 'combate' | 'resultado'>('intro');
  partidaEnAnimacion = signal<Partida | null>(null);
  resultadoAnimacion = signal<Partida | null>(null);
  entradaEquiposActiva = signal(false);
  cuentaAtras = signal<number | null>(null);
  choqueActivo = signal(false);
  marcadorRetadorAnimado = signal(0);
  marcadorRetadoAnimado = signal(0);

  private readonly timeoutIds: number[] = [];
  private readonly intervalIds: number[] = [];

  private readonly introMs = 2800;
  private readonly combateMs = 4200;
  private readonly resultadoMs = 3200;

  ngOnDestroy(): void {
    this.limpiarTimers();
  }

  ngOnInit(): void {

    this.cargarDatos();
  }

  volverAtras(): void {
    this.location.back();
  }

  cargarDatos(): void {
    if (this.esPremium()) {
      this.partidaService.cargarUsuariosDisponibles().subscribe();
      this.partidaService.cargarPendientesRecibidas().subscribe();
      this.partidaService.cargarPendientesEnviadas().subscribe();
    } else {
      this.rivalSeleccionadoId.set(null);
    }
    this.partidaService.cargarHistorial().subscribe();
  }

  crearReto(): void {
    if (!this.puedeCrearPartida()) {
      return;
    }

    const rivalId = this.rivalSeleccionadoId();

    this.creandoReto.set(true);
    this.partidaService
      .crearReto(rivalId)
      .pipe(finalize(() => this.creandoReto.set(false)))
      .subscribe(response => {
        if (response.success) {
          this.rivalSeleccionadoId.set(null);
        }
      });
  }

  aceptar(partida: Partida): void {
    this.ejecutarAccion(partida.id, () => this.partidaService.aceptarReto(partida.id));
  }

  rechazar(partida: Partida): void {
    this.ejecutarAccion(partida.id, () => this.partidaService.rechazarReto(partida.id));
  }

  cancelar(partida: Partida): void {
    this.ejecutarAccion(partida.id, () => this.partidaService.cancelarReto(partida.id));
  }

  resolver(partida: Partida): void {
    if (this.accionandoPartidaId() !== null || this.animacionVisible()) {
      return;
    }

    this.accionandoPartidaId.set(partida.id);
    this.iniciarAnimacion(partida);

    const inicio = Date.now();
    this.programar(() => {
      this.animacionFase.set('combate');
      this.activarChoque();
    }, this.introMs);

    this.partidaService
      .resolverPartida(partida.id)
      .pipe(finalize(() => this.accionandoPartidaId.set(null)))
      .subscribe(response => {
        if (!response.success || !response.partida?.id) {
          this.cerrarAnimacion();
          return;
        }

        const transcurrido = Date.now() - inicio;
        const minAntesResultado = this.introMs + this.combateMs;
        const espera = Math.max(0, minAntesResultado - transcurrido);

        this.programar(() => {
          this.resultadoAnimacion.set(response.partida);
          this.animacionFase.set('resultado');
          this.animarMarcador(response.partida);
        }, espera);
      });
  }

  verBatalla(partida: Partida): void {
    if (partida.estado !== 'resuelta' || !partida.ganador) {
      return;
    }

    if (this.animacionVisible() || this.accionandoPartidaId() !== null) {
      return;
    }

    this.iniciarAnimacion(partida);

    this.programar(() => {
      this.animacionFase.set('combate');
      this.activarChoque();
    }, this.introMs);
    this.programar(() => {
      this.resultadoAnimacion.set(partida);
      this.animacionFase.set('resultado');
      this.animarMarcador(partida);
    }, this.introMs + this.combateMs);
  }

  cerrarPopupAnimacion(): void {
    this.cerrarAnimacion();
  }

  esEquipoGanador(lado: 'retador' | 'retado'): boolean {
    const partida = this.partidaEnAnimacion();
    const resultado = this.resultadoAnimacion();

    if (!partida || !resultado?.ganador) {
      return false;
    }

    const ganadorId = resultado.ganador.id;
    return lado === 'retador' ? partida.retador.id === ganadorId : partida.retado.id === ganadorId;
  }

  esGanadorUsuarioActual(partida: Partida): boolean {
    const usuarioActualId = this.authService.usuario()?.id;
    return !!usuarioActualId && partida.ganador?.id === usuarioActualId;
  }

  private ejecutarAccion(partidaId: number, accion: () => Observable<unknown>): void {
    this.accionandoPartidaId.set(partidaId);
    accion()
      .pipe(finalize(() => this.accionandoPartidaId.set(null)))
      .subscribe();
  }

  getEquipoPersonajes(equipo: PartidaEquipoPersonaje[] | null): PartidaEquipoPersonaje[] {
    if (!equipo?.length) {
      return [];
    }

    return equipo.slice(0, 6);
  }

  getPersonajeNombre(item: PartidaEquipoPersonaje): string {
    return item.name || 'Personaje';
  }

  getPersonajeImagenUrl(item: PartidaEquipoPersonaje): string | null {
    const imageUrl = item.imageUrl;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return null;
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    return imageUrl.startsWith('/') ? `https://marvelrivalsapi.com${imageUrl}` : `https://marvelrivalsapi.com/${imageUrl}`;
  }

  getPersonajeRole(item: PartidaEquipoPersonaje): string {
    return item.role || '';
  }

  getRoleBadgeClass(role: string): string {
    switch ((role || '').toLowerCase()) {
      case 'strategist':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'vanguard':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'duelist':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  }

  private programar(callback: () => void, ms: number): void {
    const timeoutId = window.setTimeout(() => {
      this.eliminarTimer(timeoutId);
      callback();
    }, ms);

    this.timeoutIds.push(timeoutId);
  }

  private eliminarTimer(timeoutId: number): void {
    const index = this.timeoutIds.indexOf(timeoutId);
    if (index >= 0) {
      this.timeoutIds.splice(index, 1);
    }
  }

  private limpiarTimers(): void {
    this.timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.timeoutIds.length = 0;

    this.intervalIds.forEach(intervalId => window.clearInterval(intervalId));
    this.intervalIds.length = 0;
  }

  private cerrarAnimacion(): void {
    this.limpiarTimers();
    this.animacionVisible.set(false);
    this.animacionFase.set('intro');
    this.partidaEnAnimacion.set(null);
    this.resultadoAnimacion.set(null);
    this.entradaEquiposActiva.set(false);
    this.cuentaAtras.set(null);
    this.choqueActivo.set(false);
    this.marcadorRetadorAnimado.set(0);
    this.marcadorRetadoAnimado.set(0);
  }

  private iniciarAnimacion(partida: Partida): void {
    this.partidaEnAnimacion.set(partida);
    this.resultadoAnimacion.set(null);
    this.animacionFase.set('intro');
    this.animacionVisible.set(true);
    this.entradaEquiposActiva.set(false);
    this.choqueActivo.set(false);
    this.marcadorRetadorAnimado.set(0);
    this.marcadorRetadoAnimado.set(0);
    this.iniciarCuentaAtrasIntro();

    this.programar(() => this.entradaEquiposActiva.set(true), 80);
  }

  private iniciarCuentaAtrasIntro(): void {
    this.cuentaAtras.set(3);

    const paso = Math.floor(this.introMs / 3);
    this.programar(() => this.cuentaAtras.set(2), paso);
    this.programar(() => this.cuentaAtras.set(1), paso * 2);
    this.programar(() => this.cuentaAtras.set(null), Math.max(this.introMs - 180, paso * 2 + 120));
  }

  private activarChoque(): void {
    this.choqueActivo.set(true);
    this.programar(() => this.choqueActivo.set(false), 520);
  }

  private animarMarcador(partida: Partida): void {
    const objetivoRetador = partida.puntuacionRetador ?? 0;
    const objetivoRetado = partida.puntuacionRetado ?? 0;

    this.marcadorRetadorAnimado.set(0);
    this.marcadorRetadoAnimado.set(0);

    const duracion = 1100;
    const inicio = Date.now();
    const intervalId = window.setInterval(() => {
      const transcurrido = Date.now() - inicio;
      const progreso = Math.min(1, transcurrido / duracion);

      this.marcadorRetadorAnimado.set(Math.round(objetivoRetador * progreso));
      this.marcadorRetadoAnimado.set(Math.round(objetivoRetado * progreso));

      if (progreso >= 1) {
        window.clearInterval(intervalId);
        this.eliminarIntervalo(intervalId);
      }
    }, 40);

    this.intervalIds.push(intervalId);
  }

  private eliminarIntervalo(intervalId: number): void {
    const index = this.intervalIds.indexOf(intervalId);
    if (index >= 0) {
      this.intervalIds.splice(index, 1);
    }
  }
}
