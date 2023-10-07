import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p>
      contacts works!
    </p>
  `,
  styleUrls: ['./contacts.component.css']
})
export class ContactsComponent {

}
