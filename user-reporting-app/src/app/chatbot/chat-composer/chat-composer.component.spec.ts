import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatComposerComponent } from './chat-composer.component';

describe('ChatComposerComponent', () => {
  let component: ChatComposerComponent;
  let fixture: ComponentFixture<ChatComposerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComposerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
