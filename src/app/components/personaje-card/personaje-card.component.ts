import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Personaje } from '../../services/personaje.service';

@Component({
  selector: 'app-personaje-card',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './personaje-card.component.html',
  styleUrls: ['./personaje-card.component.scss'],
})
export class PersonajeCardComponent {
  @Input({ required: true }) personaje!: Personaje;
  @Input() clickable = false;
  @Input() withBadges = false;
  @Input() showContent = true;
  @Input() mediaClass = 'h-48';
  @Input() imageClass = 'w-full h-full object-contain';
  @Input() fallbackClass = 'w-full h-full flex items-center justify-center';
  @Input() fallbackIconClass = 'text-4xl';
  @Input() titleClass = 'text-white font-bold text-lg mb-2';

  @Output() cardClick = new EventEmitter<Event>();

  get cardClasses(): string {
    const classes = ['group', 'mr-character-card', 'relative'];

    if (this.clickable) {
      classes.push('mr-character-card--clickable');
    }

    if (this.withBadges) {
      classes.push('mr-character-card--with-badges');
    }

    return classes.join(' ');
  }

  get imageUrl(): string {
    const imagePath = this.personaje?.imageUrl;

    if (!imagePath) {
      return '';
    }

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const normalizedPath = imagePath.replace(/^\/+/, '');
    return `https://marvelrivalsapi.com/${normalizedPath}`;
  }

  onCardClick(event: Event): void {
    this.cardClick.emit(event);
  }
}
