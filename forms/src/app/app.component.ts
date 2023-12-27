import { Component } from '@angular/core';
import { ChangeDetectionTemplateDrivenComponent } from "./change-detection-template-driven.component";
import { ChangeDetectionReactiveComponent } from "./change-detection-reactive";
import { OnPushChangeDetectionComponent } from './on-push-change-detection.component';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    imports: [ChangeDetectionTemplateDrivenComponent, ChangeDetectionReactiveComponent, OnPushChangeDetectionComponent]
})
export class AppComponent {
  title = 'Forms';
}
