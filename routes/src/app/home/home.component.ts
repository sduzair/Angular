import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p>
      home works!
    </p>
    <button (click)="navigateToContacts()">Contacts</button>
  `,
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  router = inject(Router);
  navigateToContacts() {
    this.router.navigate(['/contacts']);
  }
}
