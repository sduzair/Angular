import { Component } from '@angular/core';
import { ChildComponent } from '../child/child.component';

@Component({
    selector: 'app-parent',
    templateUrl: './parent.component.html',
    styleUrls: ['./parent.component.css'],
    standalone: true,
    imports: [ChildComponent]
})
export class ParentComponent {
  isChildVisible = true;

  toggleChildVisibility() {
    this.isChildVisible = !this.isChildVisible;
  }
}
