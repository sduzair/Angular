import type { Routes } from '@angular/router';
import { CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE } from './aml/case-record.state.fixture';
import {
  CASE_RECORD_INITIAL_STATE,
  CaseRecordStore,
} from './aml/case-record.store';
import { hasRoleGuard, isAuthenticatedGuard } from './auth.service';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import {
  auditResolver,
  bulkEditTypeResolver,
  EditFormComponent,
  singleEditTypeResolver,
} from './reporting-ui/edit-form/edit-form.component';
import { ReportingUiTableComponent } from './reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  searchResultResolver,
  TransactionViewComponent,
} from './transaction-view/transaction-view.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login',
  },
  {
    path: '',
    loadComponent: () =>
      import('./nav-layout/nav-layout.component').then(
        (m) => m.NavLayoutComponent,
      ),
    canActivate: [isAuthenticatedGuard],
    children: [
      {
        path: '',
        redirectTo: 'transactionsearch',
        pathMatch: 'full',
      },
      {
        path: 'transactionsearch',
        loadComponent: () =>
          import('./transaction-search/transaction-search.component').then(
            (m) => m.TransactionSearchComponent,
          ),
        title: 'Search by AML Id',
      },
      {
        path: 'aml/:amlId',
        loadComponent: () =>
          import('./aml/aml.component').then((m) => m.AmlComponent),
        providers: [
          // { provide: CASE_RECORD_INITIAL_STATE, useValue: DEFAULT_SESSION_STATE },
          {
            provide: CASE_RECORD_INITIAL_STATE,
            // useValue: DEFAULT_CASE_RECORD_STATE,
            useValue: CASE_RECORD_STATE_DEV_OR_TEST_ONLY_FIXTURE,
          },
          CaseRecordStore,
        ],
        data: { reuse: true },
        title: (route) => `AML - ${route.params['amlId']}`,
        children: [
          {
            path: '',
            redirectTo: 'transaction-view',
            pathMatch: 'full',
          },
          {
            path: 'transaction-view',
            component: TransactionViewComponent,
            resolve: {
              searchResult: searchResultResolver,
            },
            data: { reuse: true },
            title: () => 'Transaction View',
            runGuardsAndResolvers: 'paramsOrQueryParamsChange',
          },
          {
            path: 'reporting-ui',
            title: () => 'Reporting UI',
            children: [
              {
                path: '',
                component: ReportingUiTableComponent,
                data: { reuse: true },
                title: () => 'Table',
              },
              {
                path: 'edit-form/bulk-edit',
                component: EditFormComponent,
                resolve: {
                  editType: bulkEditTypeResolver,
                },
                data: { reuse: false },
                title: () => 'Bulk Edit',
              },
              {
                path: 'edit-form/:transactionId',
                component: EditFormComponent,
                resolve: {
                  editType: singleEditTypeResolver,
                },
                data: { reuse: false },
                title: (route) => `Edit - ${route.params['transactionId']}`,
              },
              {
                path: 'audit/:transactionId',
                component: EditFormComponent,
                canActivate: [hasRoleGuard('Admin')],
                resolve: {
                  editType: auditResolver,
                },
                data: { reuse: false },
                title: (route) => `Audit - ${route.params['transactionId']}`,
              },
            ],
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./analytics/analytics.component').then(
                (m) => m.AnalyticsComponent,
              ),
            data: { reuse: true },
            title: () => 'Analytics',
          },
        ],
      },
    ],
  },
  { path: '**', component: PageNotFoundComponent },
];

export interface Breadcrumb {
  label: string;
  url: string;
  isLast: boolean;
}
