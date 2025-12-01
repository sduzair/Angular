// @Component({
//   selector: "app-edit-form-template",
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     TransactionDateDirective,
//     TransactionTimeDirective,
//     ControlToggleDirective,
//     ToggleEditFieldDirective,
//     ClearFieldDirective,
//     MatFormField,
//     MatToolbarModule,
//     MatIconModule,
//     MatChipsModule,
//     MatButtonModule,
//     MatCheckboxModule,
//     MatTabsModule,
//     MatCardModule,
//     MatInputModule,
//     MatDatepickerModule,
//     MatExpansionModule,
//     MatDividerModule,
//     MatOptionModule,
//     MatSelectModule,
//   ],
//   template: ` `,
//   styleUrl: "./edit-form-template.component.scss",
// })
// export class EditFormTemplateComponent
//   implements OnInit, AfterViewInit, OnDestroy
// {
//   @Input({ required: true }) editReq$: Observable<
//     { sessionId: string } & EditTabReqResType
//   > | null = null;

//   strTxnForm$: Observable<StrTxnFormType> = null!;
//   readonly strTxnBeforeEdit: WithVersion<StrTxn> | null = null;
//   readonly strTxnsBeforeBulkEdit: WithVersion<StrTxn>[] | null = null;
//   readonly sessionId: string = null!;
//   readonly editReqType: EditTabReqResTypeLiterals = null!;

//   snackBar = inject(MatSnackBar);
//   constructor(
//     private crossTabEditService: CrossTabEditService,
//     private changeLogService: ChangeLogService<StrTxn>,
//   ) {}
//   ngAfterViewInit(): void {
//     combineLatest([this.strTxnForm$, this.editReq$!])
//       .pipe(
//         takeUntil(this.destroy$),
//         delay(0),
//         map(([form, { type }]) => {
//           if (type === "AUDIT_REQUEST") {
//             form.disable();

//             const sActions = form.controls.startingActions;
//             const cActions = form.controls.completingActions;
//             sActions.controls.forEach((sa) => {
//               Object.values(sa.controls).forEach((control) => {
//                 control.disable();
//               });
//             });
//             cActions.controls.forEach((sa) => {
//               Object.values(sa.controls).forEach((control) => {
//                 control.disable();
//               });
//             });
//           }
//         }),
//       )
//       .subscribe();
//   }
//   private destroy$ = new Subject<void>();
//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }
//   ngOnInit(): void {
//     this.strTxnForm$ = combineLatest([
//       this.editReq$!,
//       this.auditVersionControl.valueChanges.pipe(startWith(0)),
//     ]).pipe(
//       takeUntil(this.destroy$),
//       map(([{ sessionId, type, payload }, auditVersion]) => {
//         (this.sessionId as string) = sessionId;
//         (this.editReqType as EditTabReqResTypeLiterals) = type;
//         if (type === "EDIT_REQUEST") {
//           (this.strTxnBeforeEdit as WithVersion<StrTxn>) = payload;
//           return this.createStrTxnForm({
//             txn: payload,
//             options: { disabled: false },
//           });
//         }
//         if (type === "BULK_EDIT_REQUEST") {
//           (this.strTxnsBeforeBulkEdit as WithVersion<StrTxn>[]) = payload;
//           return this.createStrTxnForm({
//             options: { isBulkEdit: true, disabled: true },
//           });
//         }
//         if (type === "AUDIT_REQUEST") {
//           return this.createStrTxnForm({
//             txn: this.changeLogService.applyChanges(
//               payload.auditTxnv0WithVersion,
//               payload.auditTxnChangeLogs.filter(
//                 (log) => log.version <= auditVersion,
//               ),
//             ),
//             options: { disabled: true },
//           });
//         }
//         return null!;
//       }),
//       tap((form) => form.markAllAsTouched()),
//       shareReplay({ bufferSize: 1, refCount: true }),
//     );

//     this.auditVersionOptions$ = this.editReq$!.pipe(
//       take(1),
//       filter(({ type }) => type === "AUDIT_REQUEST"),
//       tap(() => this.auditVersionControl.setValue(0)),
//       map(({ payload }) => {
//         const verMap = new Map([[0, 0]]);
//         (payload as AuditRequestPayload).auditTxnChangeLogs
//           .filter((log) => log.path !== "highlightColor")
//           .reduce((acc, log) => {
//             if (Array.from(acc.values()).includes(log.version)) return acc;

//             let lastLabelIndex = [...acc].at(-1)![0];
//             return acc.set(++lastLabelIndex, log.version);
//           }, verMap);

//         return Array.from(verMap.entries()).map(([key, val]) => ({
//           label: `v${String(key)}`,
//           value: val,
//         }));
//       }),
//     );
//   }

//   auditVersionControl = new FormControl<number>(null!, { nonNullable: true });
//   auditVersionOptions$: Observable<{ value: number; label: string }[]> = null!;

// }
