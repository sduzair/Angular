import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatPromptsComponent } from './chat-prompts.component';

describe('ChatPromptsComponent', () => {
  let component: ChatPromptsComponent;
  let fixture: ComponentFixture<ChatPromptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPromptsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPromptsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
