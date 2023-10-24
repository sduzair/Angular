import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-child-view',
    template: `
    <label for="hero-name">Hero name: </label>
    <input type="text" id="hero-name" [(ngModel)]="hero">
  `,
    standalone: true,
    imports: [FormsModule]
})
export class ChildViewComponent {
  hero = 'Magneta';
}
