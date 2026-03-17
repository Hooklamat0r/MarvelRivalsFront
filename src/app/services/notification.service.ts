import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  message: string;
  type: NotificationType;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = signal<Notification[]>([]);
  private nextId = 0;
  private defaultDuration = 5000;
  private dedupeWindowMs = 1500;
  private recentNotifications = new Map<string, number>();

  getNotifications() {
    return this.notifications.asReadonly();
  }

  success(message: string, duration: number = this.defaultDuration) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = this.defaultDuration) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = this.defaultDuration) {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = this.defaultDuration) {
    this.show(message, 'warning', duration);
  }

  private show(message: string, type: NotificationType, duration: number = this.defaultDuration) {
    const now = Date.now();
    const key = `${type}:${message}`;
    const lastShown = this.recentNotifications.get(key);

    if (lastShown && now - lastShown < this.dedupeWindowMs) {
      return;
    }

    this.recentNotifications.set(key, now);

    const id = this.nextId++;
    const notification: Notification = { message, type, id };
    
    this.notifications.update(notifications => [...notifications, notification]);
    
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number) {
    this.notifications.update(notifications => 
      notifications.filter(n => n.id !== id)
    );
  }

  clear() {
    this.notifications.set([]);
    this.recentNotifications.clear();
  }
}
