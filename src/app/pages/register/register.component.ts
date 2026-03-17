import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  authService = inject(AuthService);

  nombre = signal('');
  apellido = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  isLoading = this.authService.isLoading;
  error = this.authService.error;

  isPasswordValid = computed(() => this.password().length >= 6);
  passwordsMatch = computed(() => this.password() === this.confirmPassword());
  showPasswordError = computed(() => this.password().length > 0 && !this.isPasswordValid());

  isFormValid = computed(() => {
    return (
      this.nombre().trim() !== '' &&
      this.apellido().trim() !== '' &&
      this.email().trim() !== '' &&
      this.password().trim() !== '' &&
      this.confirmPassword().trim() !== '' &&
      this.isPasswordValid() &&
      this.passwordsMatch()
    );
  });

  onRegister(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.authService.register(
      this.email(),
      this.password(),
      this.nombre(),
      this.apellido()
    ).subscribe();
  }
}
