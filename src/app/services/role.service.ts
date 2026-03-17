import { Injectable } from '@angular/core';

interface PersonajeConRole {
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roleColors = [
    'bg-blue-900/20 text-blue-300 border-blue-500/30',
    'bg-red-900/20 text-red-300 border-red-500/30',
    'bg-green-900/20 text-green-300 border-green-500/30',
    'bg-purple-900/20 text-purple-300 border-purple-500/30',
    'bg-yellow-900/20 text-yellow-300 border-yellow-500/30',
    'bg-pink-900/20 text-pink-300 border-pink-500/30',
    'bg-indigo-900/20 text-indigo-300 border-indigo-500/30',
    'bg-cyan-900/20 text-cyan-300 border-cyan-500/30',
    'bg-amber-900/20 text-amber-300 border-amber-500/30',
    'bg-emerald-900/20 text-emerald-300 border-emerald-500/30'
  ];

  getUniqueRoles(personajes: PersonajeConRole[]): string[] {
    const roles = new Set(personajes.map(p => p.role));
    return Array.from(roles).sort();
  }

  getRoleColor(role: string): string {
    const hash = Array.from(role || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.roleColors[Math.abs(hash) % this.roleColors.length];
  }

  getRoleBadgeClass(role: string): string {
    return this.getRoleColor(role);
  }
}
