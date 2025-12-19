import { TestBed } from '@angular/core/testing';
import { FormOptionsService } from './form-options.service';

describe('FormOptionsService', () => {
  let service: FormOptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormOptionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
