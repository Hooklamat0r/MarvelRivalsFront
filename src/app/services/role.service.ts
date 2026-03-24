import { Injectable } from '@angular/core';

interface PersonajeConRole {
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roleColors: Record<string, string> = {
    Vanguard: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/50',
    Strategist: 'bg-purple-900/40 text-purple-300 border-purple-500/50',
    Duelist: 'bg-blue-900/40 text-blue-300 border-blue-500/50'
  };

  getUniqueRoles(personajes: PersonajeConRole[]): string[] {
    const roles = new Set(personajes.map(p => p.role));
    return Array.from(roles).sort();
  }

  getRoleBadgeClass(role: string): string {
    return this.roleColors[role] ?? '';
  }
}