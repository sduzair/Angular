import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home/home.component';
import { ContactsComponent } from './app/contacts/contacts.component';
import { Routes, provideRouter } from '@angular/router';
import { NotFoundComponentComponent } from './app/not-found-component/not-found-component.component';
/**
 * When the router receives a URL, it begins by comparing it against each of the paths in the configuration in the order in which they appear, top to bottom. The first match wins. This is why the wildcard path ** must be last.
 */
const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', title: 'Home', component: HomeComponent },
  { path: 'contacts', title: 'Contacts', component: ContactsComponent },
  { path: '**', title: 'Not Found', component: NotFoundComponentComponent },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
