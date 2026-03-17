import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { PremiumService } from '../../services/premium.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit {
  authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private premiumService = inject(PremiumService);
  private location = inject(Location);

  isEditing = signal(false);
  comprandoPremium = signal(false);
  mesesPremium = signal(1);

  nombre = signal('');
  apellido = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  isPasswordValid = computed(() => this.password().length === 0 || this.password().length >= 6);
  passwordsMatch = computed(() => this.password() === this.confirmPassword());
  showPasswordError = computed(() => this.password().length > 0 && !this.isPasswordValid());

  isFormValid = computed(() => {
    const usuario = this.authService.usuario();
    if (!usuario) return false;

    const nombreChanged = this.nombre().trim() !== usuario.nombre;
    const apellidoChanged = this.apellido().trim() !== usuario.apellido;
    const emailChanged = this.email().trim() !== usuario.email;
    const passwordChanged = this.password().trim() !== '';

    const hasChanges = nombreChanged || apellidoChanged || emailChanged || passwordChanged;

    if (passwordChanged) {
      return hasChanges && this.isPasswordValid() && this.passwordsMatch();
    }

    return hasChanges && this.nombre().trim() !== '' && this.apellido().trim() !== '' && this.email().trim() !== '';
  });

  ngOnInit() {
    this.loadUsuarioData();
    this.premiumService.obtenerEstado().subscribe();
  }

  volverAtras(): void {
    this.location.back();
  }

  private loadUsuarioData(): void {
    const usuario = this.authService.usuario();
    if (usuario) {
      this.nombre.set(usuario.nombre);
      this.apellido.set(usuario.apellido);
      this.email.set(usuario.email);
    }
  }

  toggleEdit(): void {
    if (this.isEditing()) {
      this.cancelEdit();
    } else {
      this.isEditing.set(true);
      this.loadUsuarioData();
    }
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.password.set('');
    this.confirmPassword.set('');
    this.loadUsuarioData();
  }

  onUpdate(): void {
    if (!this.isFormValid()) {
      return;
    }

    const updateData: any = {};

    const usuario = this.authService.usuario();
    if (!usuario) return;

    if (this.nombre().trim() !== usuario.nombre) {
      updateData.nombre = this.nombre().trim();
    }
    if (this.apellido().trim() !== usuario.apellido) {
      updateData.apellido = this.apellido().trim();
    }
    if (this.email().trim() !== usuario.email) {
      updateData.email = this.email().trim();
    }
    if (this.password().trim() !== '') {
      updateData.password = this.password().trim();
    }

    this.authService.updateUsuario(updateData).subscribe(() => {
        this.notificationService.success('Perfil actualizado correctamente');
        this.isEditing.set(false);
        this.password.set('');
        this.confirmPassword.set('');
    });
  }

  comprarPremium(): void {
    if (this.authService.usuario()?.isPremium) {
      return;
    }

    const meses = this.mesesPremium();

    this.comprandoPremium.set(true);
    this.premiumService
      .comprarPremium(meses)
      .pipe(finalize(() => this.comprandoPremium.set(false)))
      .subscribe();
  }
}
