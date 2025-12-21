import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavLayoutComponent } from './nav-layout.component';
import { provideRouter } from '@angular/router';

describe('NavLayoutComponent', () => {
  let component: NavLayoutComponent;
  let fixture: ComponentFixture<NavLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
