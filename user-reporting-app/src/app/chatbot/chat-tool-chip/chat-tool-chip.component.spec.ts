import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatToolChipComponent } from './chat-tool-chip.component';

describe('ChatToolChipComponent', () => {
  let component: ChatToolChipComponent;
  let fixture: ComponentFixture<ChatToolChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatToolChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatToolChipComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
