import { Component } from '@angular/core';

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css']
})
export class ParentComponent {
  isChildVisible = true;

  toggleChildVisibility() {
    this.isChildVisible = !this.isChildVisible;
  }
}
