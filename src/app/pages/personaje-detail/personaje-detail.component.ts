import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location, TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { PersonajeService, HeroDetail, Ability } from '../../services/personaje.service';
import { TeamUpService, TeamUp } from '../../services/teamup.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-personaje-detail',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './personaje-detail.component.html',
})
export class PersonajeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private personajeService = inject(PersonajeService);
  private teamUpService = inject(TeamUpService);
  private roleService = inject(RoleService);

  heroDetail = signal<HeroDetail | null>(null);
  teamUps = signal<TeamUp[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  readonly getRoleBadgeClass = (role: string) => this.roleService.getRoleBadgeClass(role);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de personaje no válido');
      this.isLoading.set(false);
      return;
    }

    this.personajeService.getHeroDetail(id).pipe(
      switchMap(detail => {
        this.heroDetail.set(detail);
        this.isLoading.set(false);
        return this.teamUpService.obtenerTeamUpsPorPersonaje(id);
      })
    ).subscribe((teamUps) => this.teamUps.set(teamUps));
  }

  getPartnerName(teamUp: TeamUp, currentHeroId: string): string {
    if (teamUp.personaje1.id === currentHeroId) {
      return teamUp.personaje2.name;
    }
    return teamUp.personaje1.name;
  }

  goBack(): void {
    this.location.back();
  }

  getAbilitiesByTransformation(transformationId: string) {
    const hero = this.heroDetail();
    if (!hero) return [];
    return hero.abilities.filter(ability => ability.transformation_id === transformationId);
  }

  getUniqueTransformations() {
    const hero = this.heroDetail();
    if (!hero) return [];
    const unique = new Map<string, { id: string; name: string; icon: string }>();
    hero.transformations.forEach(trans => {
      if (!unique.has(trans.id)) {
        unique.set(trans.id, { id: trans.id, name: trans.name, icon: trans.icon });
      }
    });
    return Array.from(unique.values());
  }

  getAbilitiesByType(type: string) {
    const hero = this.heroDetail();
    if (!hero) return [];
    return hero.abilities.filter(ability => ability.type === type && ability.name);
  }

  getAbilitiesByTypeForTransformation(transformationId: string, type: string) {
    const hero = this.heroDetail();
    if (!hero) return [];
    return hero.abilities.filter(
      ability =>
        ability.transformation_id === transformationId &&
        ability.type === type &&
        ability.name
    );
  }

  getUniqueAbilities() {
    const hero = this.heroDetail();
    if (!hero) return [];
    const unique = new Map<string, Ability>();
    hero.abilities.forEach(ability => {
      if (ability.name && !unique.has(ability.name)) {
        unique.set(ability.name, ability);
      }
    });
    return Array.from(unique.values());
  }

  getImportantFields(additionalFields?: Record<string, string>): Array<{key: string, value: string}> {
    if (!additionalFields) return [];
    const importantKeys = ['Key', 'Damage', 'Cooldown', 'Range', 'Energy Cost', 'Duration'];
    return Object.entries(additionalFields)
      .filter(([key]) => importantKeys.includes(key))
      .map(([key, value]) => ({ key, value }))
      .slice(0, 3);
  }
}

