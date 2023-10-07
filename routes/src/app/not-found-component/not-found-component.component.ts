import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found-component',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p>
      not-found-component works!
    </p>
  `,
  styleUrls: ['./not-found-component.component.css']
})
export class NotFoundComponentComponent {

}
