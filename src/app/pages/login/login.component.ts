import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  authService = inject(AuthService);

  email = signal('');
  password = signal('');

  isFormValid = computed(() => {
    return this.email().trim() !== '' && this.password().trim() !== '';
  });

  onLogin(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.authService.login(this.email(), this.password()).subscribe();
  }
}
