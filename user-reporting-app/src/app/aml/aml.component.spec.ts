import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmlComponent } from './aml.component';
import {
  CASE_RECORD_INITIAL_STATE,
  CaseRecordStore,
} from './case-record.store';
import { CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE } from './case-record.state.fixture';
import { provideHashbrown } from '@hashbrownai/angular';

describe('AmlComponent', () => {
  let component: AmlComponent;
  let fixture: ComponentFixture<AmlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmlComponent],
      providers: [
        {
          provide: CASE_RECORD_INITIAL_STATE,
          useValue: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE,
        },
        CaseRecordStore,
        provideHashbrown({}),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AmlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
