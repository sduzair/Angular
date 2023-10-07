import { Component } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [FormsModule, ReactiveFormsModule]
})
export class AppComponent {
  title = 'Forms';
  // NgModel Directive - Binds the input to name property of component class and tracks it - Two Way Binding
  name: string = '';

  // Basic Form - Template Driven
  lastName = '';
  showLastName() {
    console.log(this.lastName);
  }

  // Form Validation
  licence = '';
  showLicence() {
    console.log(this.licence);
  }

  // Basic Form - Reactive
  school = new FormControl('');
  showSchool() {
    console.log(this.school.value);
  }

  // Loign Form - Reactive - Grouping Controls
  loginForm = new FormGroup({
    "username": new FormControl('', Validators.required),
    "password": new FormControl('', Validators.required),
  });

  login() {
    console.log("Username: " + this.loginForm.value.username);
    console.log("Password: " + this.loginForm.value.password);
  }
}
