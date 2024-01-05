import { Component } from '@angular/core';
import { ChangeDetectionTemplateDrivenComponent } from "./change-detection-template-driven.component";
import { ChangeDetectionReactiveComponent, Roles } from "./change-detection-reactive";
import { OnPushChangeDetectionComponent } from './on-push-change-detection.component';
import { UserService } from './user.service';
import { Observable } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
      <h1>{{ title }}</h1>

      <h2>Template-driven form - Change detection</h2>
      <change-detection-template-driven></change-detection-template-driven>

      <h2>Reactive form - Change detection</h2>
      <div *ngIf="roles$ | async as roles else loading">
        <change-detection-reactive [roles]="roles"></change-detection-reactive>
      </div>
      <ng-template #loading>Loading...</ng-template>

      <h2>OnPush Change Detection Strategy</h2>
      <on-push-change-detection></on-push-change-detection>
    `,
  styles: `
    input.ng-valid {
      background-color: #79ba6a;
    }

    input.ng-invalid {
      background-color: #f58c84;
    }
  `,
  imports: [ChangeDetectionTemplateDrivenComponent, ChangeDetectionReactiveComponent, OnPushChangeDetectionComponent, AsyncPipe, CommonModule]
})
export class AppComponent {
  title = 'Forms';
  roles$: Observable<Roles>;

  constructor(private _userNameService: UserService) {
    this.roles$ = this._userNameService.getRoles();
  }
}
