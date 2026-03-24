import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { PersonajesComponent } from './pages/personajes/personajes.component';
import { PersonajeDetailComponent } from './pages/personaje-detail/personaje-detail.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { MisPersonajesComponent } from './pages/mis-personajes/mis-personajes.component';
import { AdminComponent } from './pages/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { PartidasComponent } from './pages/partidas/partidas.component';
import { AmigosComponent } from './pages/amigos/amigos.component';
import { AyudaComponent } from './pages/ayuda/ayuda.component';
import { notAuthGuard } from './guards/notAuth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [notAuthGuard] },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: "Dashboard"
      },
      {
        path: 'personajes',
        component: PersonajesComponent,
        title: "Personajes"
      },
      {
        path: 'personajes/:id',
        component: PersonajeDetailComponent,
        title: "Personaje"
      },
      {
        path: 'perfil',
        component: PerfilComponent,
        title: "Perfil"
      },
      {
        path: 'mis-personajes',
        component: MisPersonajesComponent,
        title: "Equipo"
      },
      {
        path: 'partidas',
        component: PartidasComponent,
        title: "Partidas"
      },
      {
        path: 'amigos',
        component: AmigosComponent,
        title: "Amigos"
      },
      {
        path: 'ayuda',
        component: AyudaComponent,
        title: "Ayuda"
      },
      {
        path: 'admin',
        component: AdminComponent,
        canActivate: [adminGuard],
        title: "Admin"
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard'}
];
