import type { Routes } from '@angular/router';
import { lastUpdatedResolver, savingStatusResolver } from './aml/aml.component';
import {
  CASE_RECORD_INITIAL_STATE,
  CaseRecordStore,
  DEFAULT_CASE_RECORD_STATE,
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
import {
  ReportingUiTableComponent,
  savingEditsResolver,
  strTransactionsEditedResolver,
} from './reporting-ui/reporting-ui-table/reporting-ui-table.component';
import {
  initSelectionsResolver,
  transactionSearchResolver,
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
            useValue: DEFAULT_CASE_RECORD_STATE,
            // useValue: SESSION_STATE_DEV_OR_TEST_ONLY_FIXTURE,
          },
          CaseRecordStore,
        ],
        resolve: {
          lastUpdated$: lastUpdatedResolver,
          savingStatus$: savingStatusResolver,
        },
        data: { reuse: true },
        children: [
          {
            path: 'transaction-view',
            component: TransactionViewComponent,
            resolve: {
              transactionSearch: transactionSearchResolver,
              initSelections: initSelectionsResolver,
            },
            data: { reuse: true },
            title: (route) => `Transaction View - ${route.params['amlId']}`,
          },
          {
            path: 'reporting-ui',
            title: (route) => `Reporting UI - ${route.params['amlId']}`,
            children: [
              {
                path: '',
                redirectTo: 'table',
                pathMatch: 'full',
              },
              {
                path: 'table',
                component: ReportingUiTableComponent,
                resolve: {
                  strTransactionData$: strTransactionsEditedResolver,
                  savingEdits$: savingEditsResolver,
                },
                data: { reuse: true },
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
        ],
      },
    ],
  },
  { path: '**', component: PageNotFoundComponent },
];
