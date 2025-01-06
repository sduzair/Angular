import { Component, Input } from "@angular/core";
// biome-ignore lint/style/useImportType: <explanation>
import { MissionService } from "../mission.service";
import type { NextObserver } from "rxjs";

@Component({
  selector: "app-astronaut",
  imports: [],
  template: `<p>
      {{ astronaut }}: <strong>{{ mission }} </strong>
    </p>
    <button (click)="confirm()" [disabled]="confirmed || !announced()">
      Confirm
    </button>`,
  styleUrl: "./Astronaut.component.css",
})
export class AstronautComponent {
  @Input()
  astronaut!: string;
  mission = "No mission announced";
  confirmed = false;
  announced = () => this.mission !== "No mission announced";
  missionAnnouncedObserver: NextObserver<string>;

  constructor(private missionService: MissionService) {
    this.missionAnnouncedObserver = {
      next: (val: string) => {
        this.mission = val;
        this.confirmed = false;
      },
    };
    missionService.missionAnnounced$.subscribe(this.missionAnnouncedObserver);
  }

  confirm() {
    this.confirmed = true;
    this.missionService.confirmMission(this.astronaut);
  }
}
