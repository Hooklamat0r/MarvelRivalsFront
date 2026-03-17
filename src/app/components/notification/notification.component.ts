import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationType } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
})
export class NotificationComponent {
  private notificationService = inject(NotificationService);
  notifications = this.notificationService.getNotifications();

  private readonly typeClasses: Record<NotificationType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
  };

  private readonly buttonClasses: Record<NotificationType, string> = {
    success: 'text-green-100 hover:bg-green-500 focus:ring-green-500',
    error: 'text-red-100 hover:bg-red-500 focus:ring-red-500',
    warning: 'text-yellow-100 hover:bg-yellow-500 focus:ring-yellow-500',
    info: 'text-blue-100 hover:bg-blue-500 focus:ring-blue-500',
  };

  getNotificationClass(type: NotificationType): string {
    return `p-4 rounded-lg shadow-lg ${this.typeClasses[type] || this.typeClasses.info}`;
  }

  getButtonClass(type: NotificationType): string {
    return this.buttonClasses[type] || this.buttonClasses.info;
  }

  dismiss(id: number): void {
    this.notificationService.remove(id);
  }
}
