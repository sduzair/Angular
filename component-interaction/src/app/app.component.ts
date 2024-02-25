import { Component } from '@angular/core';
import { MissionControlComponent } from './missioncontrol.component';
import { CountdownTimerComponent } from './countdown-timer.component';
import { CountdownLocalVarParentComponent, CountdownViewChildParentComponent, CountdownContentChildParentComponent } from './countdown-parent.component';
import { VoteTakerComponent } from './votetaker.component';
import { VersionParentComponent } from './version-parent.component';
import { NameParentComponent } from './name-parent.component';
import { HeroParentComponent } from './hero-parent.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: true,
    imports: [
        HeroParentComponent,
        NameParentComponent,
        VersionParentComponent,
        VoteTakerComponent,
        CountdownLocalVarParentComponent,
        CountdownViewChildParentComponent,
        CountdownContentChildParentComponent,
        CountdownTimerComponent,
        MissionControlComponent,
    ],
})
export class AppComponent { }
