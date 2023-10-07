import { Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [HeaderComponent, NgFor, NgIf]  // Importing Component
})
export class AppComponent {
  // Interpolation - String
  text = 'Hello World!';
  // Interpolation - Property Binding
  imageURL = 'https://www.sololearn.com/images/tree.jpg';
  columnsCount = 3;

  isActive = true;

  // Event Binding
  onClick() {
    alert('Button was clicked!');
  }

  // Property and Event Binding
  isRed = true;
  toggleRed() {
    this.isRed = !this.isRed;
  }

  // Directive - ngIf
  products = ["Apple", "Banana", "Orange"];
}
