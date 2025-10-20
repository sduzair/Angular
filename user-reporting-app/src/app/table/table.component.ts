import { CommonModule, DatePipe } from "@angular/common";
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  type OnInit,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatChipsModule } from "@angular/material/chips";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatToolbarModule } from "@angular/material/toolbar";
import { ActivatedRoute } from "@angular/router";
import {
  BehaviorSubject,
  Subject,
  catchError,
  combineLatest,
  interval,
  map,
  scan,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
  throwError,
} from "rxjs";
import { AbstractBaseTable } from "../base-table/abstract-base-table";
import {
  ChangeLog,
  ChangeLogService,
  WithVersion,
} from "../change-log.service";
import { CrossTabEditService } from "../cross-tab-edit.service";
import { AuthService } from "../fingerprinting.service";
import {
  SessionDataService,
  type SessionStateLocal,
} from "../session-data.service";
import { removePageFromOpenTabs } from "../single-tab.guard";
import { ClickOutsideTableDirective } from "./click-outside-table.directive";
import { ImportManualTxnsComponent } from "./import-manual-txns/import-manual-txns.component";
import { PadZeroPipe } from "./pad-zero.pipe";

// @Component({
//   selector: "app-table",
//   imports: [
//     CommonModule,
//     MatTableModule,
//     MatPaginatorModule,
//     MatSortModule,
//     DatePipe,
//     MatFormFieldModule,
//     MatIconModule,
//     ReactiveFormsModule,
//     MatInputModule,
//     MatDatepicker,
//     MatDatepickerInput,
//     MatDatepickerToggle,
//     MatCheckboxModule,
//     MatSidenavModule,
//     MatToolbarModule,
//     MatButtonModule,
//     MatInputModule,
//     PadZeroPipe,
//     MatChipsModule,
//     ClickOutsideTableDirective,
//     MatProgressSpinnerModule,
//     MatSelectModule,
//     ImportManualTxnsComponent,
//   ],
//   template: `
//     <div class="table-system">
//       <mat-toolbar>
//         <mat-toolbar-row>
//           <h1>reporting ui</h1>
//           <mat-chip
//             *ngif="lastupdated"
//             selected="true"
//             class="last-updated-chip"
//           >
//             <ng-container
//               *ngif="sessiondataservice.saving$ | async; else updateicon"
//             >
//               <mat-progress-spinner
//                 diameter="20"
//                 mode="indeterminate"
//                 class="last-updated-chip-spinner"
//               ></mat-progress-spinner>
//             </ng-container>
//             <ng-template #updateicon>
//               <mat-icon class="mat-accent last-updated-chip-spinner"
//                 >update</mat-icon
//               >
//             </ng-template>
//             last updated: {{ lastupdated | date : "short" }}
//           </mat-chip>
//         </mat-toolbar-row>
//         <mat-toolbar-row>
//           <!-- active filter chips -->
//           <mat-chip-set aria-label="active filters" class="filter-chips">
//             <mat-chip
//               *ngfor="
//                 let filter of filterformactivefilters$ | async;
//                 trackby: filterformtrackby
//               "
//               removable="true"
//               highlighted="true"
//               disableripple="true"
//               (removed)="filterformremovefilter(filter.sanitizedkey)"
//             >
//               {{ filter.header }}:
//               <ng-container
//                 *ngif="
//                   filterformhighlightselectfilterkey === filter.sanitizedkey;
//                   else showvalue
//                 "
//               >
//                 <span
//                   class="color-box-in-chip"
//                   [ngstyle]="{ 'background-color': filter.value }"
//                 ></span>
//               </ng-container>
//               <ng-template #showvalue>
//                 {{ filter.value }}
//               </ng-template>
//               <button matchipremove>
//                 <mat-icon>cancel</mat-icon>
//               </button>
//             </mat-chip>
//           </mat-chip-set>
//           @defer {
//           <app-import-manual-txns />
//           }
//           <mat-chip-set class="color-pallette">
//             <mat-chip
//               *ngfor="
//                 let option of object.entries(filterformhighlightmap);
//                 trackby: filterformhighlightmaptrackby
//               "
//               [style.backgroundcolor]="option[0]"
//               (click)="filterformhighlightselectedcolor = option[0]"
//               [highlighted]="filterformhighlightselectedcolor === option[0]"
//             >
//               <span class="invisible-text">1</span>
//             </mat-chip>
//             <mat-chip
//               (click)="filterformhighlightselectedcolor = null"
//               [highlighted]="filterformhighlightselectedcolor === null"
//             >
//               <mat-icon>cancel</mat-icon>
//             </mat-chip>
//           </mat-chip-set>
//           //
//           <button
//             (click)="openbulkeditformtab()"
//             *ngif="!this.selection.isempty()"
//             mat-flat-button
//             [disabled]="this.issingleorbulkedittabopen$ | async"
//           >
//             <mat-icon>edit</mat-icon>
//             bulk edit ({{ this.selection.selected.length }})
//           </button>
//           <button mat-raised-button (click)="drawer.toggle()">
//             <mat-icon>filter_list</mat-icon>
//             filter
//           </button>
//         </mat-toolbar-row>
//       </mat-toolbar>
//       <mat-drawer-container class="table-filter-container" hasbackdrop="false">
//         <mat-drawer position="end" #drawer>
//           <form [formgroup]="filterformformgroup" class="filter-header">
//             <mat-toolbar>
//               <mat-toolbar-row>
//                 <button mat-raised-button color="primary" type="submit">
//                   apply
//                 </button>
//                 <button
//                   mat-button
//                   color="warn"
//                   type="button"
//                   (click)="filterformformgroup.reset()"
//                   [disabled]="filterformformgroup.pristine"
//                 >
//                   reset filters
//                 </button>
//                 <div class="flex-fill"></div>
//                 <button mat-icon-button (click)="drawer.toggle()">
//                   <mat-icon>close</mat-icon>
//                 </button>
//               </mat-toolbar-row>
//             </mat-toolbar>
//             <ng-container
//               *ngfor="
//                 let key of filterformfilterkeys;
//                 trackby: filterformtrackby
//               "
//             >
//               <!-- text filter -->
//               <mat-form-field *ngif="filterformistextfilterkey(key)">
//                 <mat-label
//                   >filter {{ this.displayedcolumnstransform(key) }}</mat-label
//                 >
//                 <input
//                   matinput
//                   [formcontrolname]="this.filterformfilterformkeysanitize(key)"
//                 />
//                 <button
//                   matsuffix
//                   mat-icon-button
//                   *ngif="
//                     filterformformgroup.get(
//                       this.filterformfilterformkeysanitize(key)
//                     )?.value
//                   "
//                   (click)="
//                     this.filterformformgroup
//                       .get(this.filterformfilterformkeysanitize(key))
//                       ?.reset()
//                   "
//                 >
//                   <mat-icon>clear</mat-icon>
//                 </button>
//               </mat-form-field>
//               //
//               <!-- date filter  -->
//               <div *ngif="this.datefiltersisdatefilterkey(key)">
//                 <mat-form-field>
//                   <mat-label>{{
//                     this.displayedcolumnstransform(key)
//                   }}</mat-label>
//                   <input
//                     matinput
//                     [formcontrolname]="
//                       this.filterformfilterformkeysanitize(key)
//                     "
//                     [matdatepicker]="picker"
//                   />
//                   <mat-datepicker-toggle
//                     matsuffix
//                     [for]="picker"
//                   ></mat-datepicker-toggle>
//                   <mat-datepicker #picker></mat-datepicker>
//                 </mat-form-field>
//               </div>
//               //
//               <!-- column filter  -->
//               <div
//                 *ngif="
//                   this.selectfiltersisselectfilterkey(key) &&
//                   this.selectfiltersparsefilterkey(key) !== 'highlightcolor'
//                 "
//               >
//                 <mat-form-field>
//                   <mat-label>{{
//                     this.displayedcolumnstransform(key)
//                   }}</mat-label>
//                   <mat-select
//                     matnativecontrol
//                     [formcontrolname]="
//                       this.filterformfilterformkeysanitize(key)
//                     "
//                   >
//                     <mat-option
//                       *ngfor="
//                         let option of selectfiltersoptionsselectionsfiltered$[
//                           key
//                         ] | async;
//                         trackby: selectfilterstrackbyoption
//                       "
//                       [value]="option"
//                     >
//                       {{ option }}
//                     </mat-option>
//                   </mat-select>
//                 </mat-form-field>
//               </div>
//               //
//               <div *ngif="key === this.filterformhighlightselectfilterkey">
//                 <mat-form-field>
//                   <mat-label>{{
//                     this.displayedcolumnstransform(key)
//                   }}</mat-label>
//                   <mat-select
//                     [formcontrolname]="this.filterformhighlightselectfilterkey"
//                   >
//                     <mat-option
//                       *ngfor="
//                         let option of object.entries(filterformhighlightmap);
//                         trackby: filterformhighlightmaptrackby
//                       "
//                       [value]="option"
//                     >
//                       <span
//                         class="color-box"
//                         [ngstyle]="{ 'background-color': option[0] }"
//                       ></span>
//                       {{ option[1] }}
//                     </mat-option>
//                   </mat-select>
//                 </mat-form-field>
//               </div>
//             </ng-container>
//           </form>
//         </mat-drawer>
//         //
//         <mat-drawer-content>
//           <div
//             class="table-container"
//             (appclickoutsidetable)="
//               filterformhighlightselectedcolor = undefined
//             "
//           >
//             <table
//               mat-table
//               [datasource]="datasource"
//               [trackby]="datasourcetrackby"
//               matsort
//             >
//               <!-- action column -->
//               <ng-container matcolumndef="actions">
//                 <th mat-header-cell *matheadercelldef>
//                   <div [class.sticky-cell]="true">actions</div>
//                 </th>
//                 <td
//                   mat-cell
//                   *matcelldef="let row"
//                   [ngstyle]="{
//                     backgroundcolor: row.highlightcolor || ''
//                   }"
//                 >
//                   <div [class.sticky-cell]="true">
//                     <button
//                       [disabled]="this.issingleorbulkedittabopen$ | async"
//                       mat-icon-button
//                       (click)="openeditformtab(row)"
//                     >
//                       <mat-icon>edit</mat-icon>
//                     </button>
//                     <button
//                       [disabled]="this.issingleorbulkedittabopen$ | async"
//                       mat-icon-button
//                       (click)="openauditformtab(row)"
//                     >
//                       <mat-icon>history</mat-icon>
//                     </button>
//                   </div>
//                 </td>
//               </ng-container>
//               <!-- selection model -->
//               <ng-container matcolumndef="select">
//                 <th mat-header-cell *matheadercelldef>
//                   <mat-checkbox
//                     (change)="$event ? toggleallrows() : null"
//                     [checked]="selection.hasvalue() && isallselected()"
//                     [indeterminate]="selection.hasvalue() && !isallselected()"
//                     [disabled]="this.issingleorbulkedittabopen$ | async"
//                   >
//                   </mat-checkbox>
//                 </th>
//                 <td mat-cell *matcelldef="let row">
//                   <mat-checkbox
//                     (click)="$event.stoppropagation()"
//                     (change)="$event ? selection.toggle(row) : null"
//                     [checked]="selection.isselected(row)"
//                     [disabled]="this.issingleorbulkedittabopen$ | async"
//                   >
//                   </mat-checkbox>
//                 </td>
//               </ng-container>
//               <!-- column definitions  -->
//               <ng-container
//                 *ngfor="let column of datacolumnsdisplayvalues"
//                 [matcolumndef]="column"
//               >
//                 <th
//                   mat-header-cell
//                   *matheadercelldef
//                   [mat-sort-header]="column"
//                 >
//                   <div [class.sticky-cell]="isstickycolumn(column)">
//                     {{
//                       column !== "_hiddenvalidation"
//                         ? this.displayedcolumnstransform(column)
//                         : ""
//                     }}
//                   </div>
//                 </th>
//                 <td mat-cell *matcelldef="let row">
//                   <div [class.sticky-cell]="isstickycolumn(column)">
//                     <ng-container *ngif="column === '_hiddenvalidation'">
//                       <ng-container *ngfor="let ch of row._hiddenvalidation">
//                         <span
//                           [style.background-color]="getcolorforvalidation(ch)"
//                           >{{ ch[0].touppercase() }}</span
//                         >
//                       </ng-container>
//                     </ng-container>
//                     <ng-container
//                       *ngif="this.datefiltersvaluestime.includes(column)"
//                     >
//                       {{
//                         this.datacolumnsgetunsafevaluebypath(row, column)
//                           | apppadzero : 5
//                       }}
//                     </ng-container>
//                     <ng-container
//                       *ngif="this.datefiltersvalues.includes(column)"
//                     >
//                       {{
//                         this.datacolumnsgetunsafevaluebypath(row, column)
//                           | date : "mm/dd/yyyy"
//                       }}
//                     </ng-container>
//                     <ng-container
//                       *ngif="
//                         !this.datefiltersvalues.includes(column) &&
//                         !this.datefiltersvaluesignore.includes(column) &&
//                         column !== '_hiddenvalidation'
//                       "
//                     >
//                       {{ this.datacolumnsgetunsafevaluebypath(row, column) }}
//                     </ng-container>
//                   </div>
//                 </td>
//               </ng-container>
//               //
//               <tr
//                 mat-header-row
//                 *matheaderrowdef="this.displayedcolumnsvalues"
//               ></tr>
//               <tr
//                 mat-row
//                 *matrowdef="let row; columns: this.displayedcolumnsvalues"
//                 [class.recentopenhighlight]="
//                   this.recentopenrows.includes(row._mongoid)
//                 "
//                 (click)="filterformassignselectedcolortorow(row, $event)"
//                 [style.cursor]="
//                   filterformhighlightselectedcolor !== undefined
//                     ? 'pointer'
//                     : 'default'
//                 "
//               ></tr>
//             </table>
//           </div>
//         </mat-drawer-content>
//       </mat-drawer-container>
//       <mat-paginator
//         [pagesizeoptions]="pagesizeoptions"
//         [pagesize]="pagesize"
//         showfirstlastbuttons
//         aria-label="select page of periodic elements"
//       >
//       </mat-paginator>
//     </div>
//   `,
//   styleUrls: ["./table.component.scss"],
//   providers: [],
//   changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class TableComponent<
//     TData extends WithVersion<StrTxnExtraProps>,
//     TDataColumn extends StrTxnDataColumnKey,
//     TDisplayColumn extends StrTxnDataColumnKey | "actions" | "select",
//     TFilterKeys extends string,
//     TSelection extends { _mongoid: string },
//   >
//   extends AbstractBaseTable<
//     TData,
//     TDataColumn,
//     TDisplayColumn,
//     TFilterKeys,
//     TSelection
//   >
//   implements OnInit, AfterViewInit, OnDestroy
// {
//   dataSource = new MatTableDataSource<WithVersion<StrTxnExtraProps>>();


//   constructor(
//     private changeLogService: ChangeLogService<StrTxnExtraProps>,
//     private crossTabEditService: CrossTabEditService,
//     private authService: AuthService,
//     protected sessionDataService: SessionDataService,
//     private recordService: RecordService,
//     private route: ActivatedRoute,
//   ) {
//     super();
//   }

//   private destroy$ = new Subject<void>();

//   @HostListener("window:beforeunload", ["$event"])
//   ngOnDestroy = ((_$event: Event) => {
//     this.destroy$.next();
//     this.destroy$.complete();

//     if (this.editFormTab) this.editFormTab.close();
//     if (this.bulkEditFormTab) this.bulkEditFormTab.close();

//     removePageFromOpenTabs(this.route.snapshot);
//   }) as () => void;

//   ngOnInit() {
//     this.dataSource.filterPredicate = this.filterFormFilterPredicateCreate();
//     this.setupTableDataSource();

//     this.sessionDataService.conflict$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe(() => {
//         this.editFormTab?.close();
//         this.bulkEditFormTab?.close();
//       });

//     this.filterFormFormGroup.valueChanges.subscribe((val) => {
//       if (this.filterFormFormGroup.invalid) return;
//       this.dataSource.filter = JSON.stringify(val);
//       this.selection.clear();
//     });
//   }

//   lastUpdated?: string;
//   setupTableDataSource() {
//     this.authService.userAuthId$
//       .pipe(
//         switchMap((userAuthId) =>
//           this.sessionDataService
//             .fetchSessionByAmlId("64a7f8c9e3a5b1d2f3c4e5a6")
//             .pipe(
//               catchError((error) => {
//                 if (error.status === 404) {
//                   return this.sessionDataService.initialize(userAuthId);
//                 }
//                 return throwError(() => error);
//               }),
//             ),
//         ),
//         switchMap(() =>
//           combineLatest([
//             this.recordService.getStrTxns().pipe(map(this.addDisplayProps)),
//             this.sessionDataService.sessionState$,
//           ]),
//         ),
//         tap(([_, { lastUpdated }]) => {
//           this.lastUpdated = lastUpdated;
//         }),
//         // tap(([strTxns, sessionState]) => {
//         //   console.log(strTxns, sessionState);
//         // }),
//         scan((acc, [strTxns, sessionState]) => {
//           const {
//             editedTransactions: { strTxnChangeLogs },
//             editTabPartialChangeLogsResponse,
//           } = sessionState;

//           // apply edit tab res change logs and return
//           if (editTabPartialChangeLogsResponse != null) {
//             console.assert(acc.length > 0);
//             return acc
//               .map<
//                 Parameters<typeof TableComponent.prototype.addValidationInfo>[0]
//               >((strTxn) => {
//                 const { strTxnId, changeLogs: partialChangeLogs = [] } =
//                   editTabPartialChangeLogsResponse.find(
//                     (res) => res.strTxnId === strTxn._mongoid,
//                   ) || {};

//                 const { changeLogs: completeChangeLogs = [] } =
//                   strTxnChangeLogs?.find(
//                     (editedUser) => editedUser.strTxnId === strTxn._mongoid,
//                   ) || {};

//                 if (!strTxnId) {
//                   return { patchedStrTxn: strTxn, completeChangeLogs };
//                 }

//                 return {
//                   patchedStrTxn: this.changeLogService.applyChanges(
//                     strTxn,
//                     partialChangeLogs,
//                   ),
//                   completeChangeLogs,
//                 };
//               })
//               .map(TableComponent.prototype.addValidationInfo);
//           }

//           return strTxns
//             .map<
//               Parameters<typeof TableComponent.prototype.addValidationInfo>[0]
//             >((strTxn) => {
//               const { changeLogs = [] } =
//                 strTxnChangeLogs?.find(
//                   (editedUser) => editedUser.strTxnId === strTxn._mongoid,
//                 ) || {};
//               return {
//                 patchedStrTxn: this.changeLogService.applyChanges(
//                   strTxn,
//                   changeLogs,
//                 ),
//                 completeChangeLogs: changeLogs,
//               };
//             })
//             .map(this.addValidationInfo);
//         }, [] as WithVersion<StrTxnExtraProps>[]),
//         tap((strTxns) => this.selectFiltersComputeUniqueFilterOptions(strTxns)),
//         takeUntil(this.destroy$),
//       )
//       .subscribe((strTxns) => {
//         this.dataSource.data = strTxns;
//       });

//     // init page size setup
//     this.recordService
//       .getStrTxns()
//       .pipe(
//         take(1),
//         tap((txns) => this.updatePageSizeOptions(txns.length)),
//       )
//       .subscribe();
//   }


//   missingConductors(sa: StartingAction) {
//     if (!sa.wasCondInfoObtained) return false;

//     if (sa.conductors.length === 0) return true;
//     if (sa.conductors.some((cond) => !cond.linkToSub)) return true;

//     return false;
//   }

//   missingCibcInfo(action: StartingAction | CompletingAction) {
//     if (action.fiuNo !== "010") return false;

//     if (
//       !action.branch ||
//       !action.account ||
//       !action.accountType ||
//       (action.accountType === "Other" && !action.accountTypeOther) ||
//       !action.accountCurrency ||
//       !action.accountStatus ||
//       !action.accountOpen ||
//       (action.accountStatus === "Closed" && !action.accountClose)
//     )
//       return true;

//     return false;
//   }

//   addDisplayProps(txns: StrTxn[]): WithVersion<StrTxnExtraProps>[] {
//     return txns.map((txn) => ({
//       ...txn,
//       _hiddenTxnType: txn.reportingEntityTxnRefNo.split("-")[0],
//       _hiddenAmlId: "41179074",
//       _version: 0,
//     }));
//   }

//   addValidationInfo({
//     patchedStrTxn,
//     completeChangeLogs,
//   }: {
//     patchedStrTxn: WithVersion<StrTxnExtraProps>;
//     completeChangeLogs: ChangeLog[];
//   }) {
//     const errors: _hiddenValidationType[] = [];
//     if (
//       patchedStrTxn._version &&
//       patchedStrTxn._version > 0 &&
//       !completeChangeLogs.every((log) => log.path === "highlightColor")
//     )
//       errors.push("Edited Txn");
//     if (patchedStrTxn.startingActions.some(this.missingConductors))
//       errors.push("Conductor Missing");
//     if (
//       patchedStrTxn.startingActions.some(this.missingCibcInfo) ||
//       patchedStrTxn.completingActions.some(this.missingCibcInfo)
//     )
//       errors.push("Bank Info Missing");

//     patchedStrTxn._hiddenValidation = errors;
//     return patchedStrTxn;
//   }

//   getColorForValidation(error: _hiddenValidationType): string {
//     const colors: Record<_hiddenValidationType, string> = {
//       "Conductor Missing": "#dc3545",
//       "Bank Info Missing": "#ba005c",
//       "Edited Txn": "#0d6efd",
//     };
//     if (!error) return "#007bff"; // fallback color
//     return colors[error];
//   }
// }

export interface SessionDataReqBody {
  userId: string;
  data: SessionStateLocal;
}

// export type ColumnHeaderLabels =
//   (typeof TableComponent.prototype.displayedColumnsColumnHeaderMap)[keyof typeof TableComponent.prototype.displayedColumnsColumnHeaderMap];
