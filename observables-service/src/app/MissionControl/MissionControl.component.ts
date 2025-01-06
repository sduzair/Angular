import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AstronautComponent } from "../Astronaut/Astronaut.component";
// biome-ignore lint/style/useImportType: <explanation>
import { MissionService } from "../mission.service";
import { type NextObserver, Observer } from "rxjs";

@Component({
  selector: "app-mission-control",
  imports: [CommonModule, AstronautComponent],
  template: `<h3>MissionControl works!</h3>
    <h4>Mission: {{ missions[nextMission] }}</h4>
    <button (click)="announce()">Announce</button>
    <app-astronaut
      *ngFor="let astronaut of astronauts"
      [astronaut]="astronaut"
    />
    <h4>History:</h4>
    <p *ngFor="let msg of history">{{ msg }}</p> `,
  styleUrl: "./MissionControl.component.css",
})
export class MissionControlComponent {
  missions = ["Fly to the moon", "Fly to mars", "Fly to andromeda galaxy"];
  astronauts = ["Neil", "Hasan", "Kalpana"];
  nextMission = 0;
  history: string[] = [];
  missionConfirmedObserver: NextObserver<string>;
  constructor(private missionService: MissionService) {
    this.missionConfirmedObserver = {
      next: (val: string) => {
        this.history.push(`Astronaut ${val} has confirmed the mission`);
      },
    };

    this.missionService.missionConfirmed$.subscribe(
      this.missionConfirmedObserver
    );
  }

  announce() {
    if (this.nextMission >= this.missions.length) return;
    const mission = this.missions[this.nextMission++];
    this.missionService.announceMission(mission);
    this.history.push(`Mission "${mission}" announced`);
  }
}
