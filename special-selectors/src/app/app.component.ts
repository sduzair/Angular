import { Component } from '@angular/core';
import { ParentComponent } from './parent/parent.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: true,
    imports: [ParentComponent]
})
export class AppComponent {
  title = 'special-selectors';
}
