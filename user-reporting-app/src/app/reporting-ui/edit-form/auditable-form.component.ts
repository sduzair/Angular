import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { filter, map, shareReplay, startWith, tap, withLatestFrom } from 'rxjs';
import {
  ChangeLogAudit,
  StrTransactionWithChangeLogs,
} from '../../aml/case-record.store';
import { EditableFormComponent } from './editable-form.component';

@Component({
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export abstract class AuditableFormComponent extends EditableFormComponent {
  protected auditVersionControl = new FormControl<number>(NaN, {
    nonNullable: true,
  });

  protected auditVersionChangeLogPaths: string[] = [];
  protected auditVersionOptions$ = this.editType$.pipe(
    filter(({ type }) => type === 'AUDIT_REQUEST'),
    map(({ payload }) =>
      (payload as StrTransactionWithChangeLogs).changeLogs.filter(
        (log) => log.path !== '/highlightColor',
      ),
    ),
    tap((changes) => {
      this.auditVersionControl.setValue(changes.at(-1)?.eTag ?? 0);
    }),
    map((changes) => {
      const verMap = new Map<number, ChangeLogAudit>([
        [
          0,
          {
            eTag: 0,
            op: 'test',
            path: '',
            updatedAt: '',
            updatedBy: '',
            value: null,
          },
        ],
      ]);

      changes.forEach((log) => {
        if (Array.from(verMap.values()).find((val) => val.eTag === log.eTag!))
          return;

        let lastLabelIndex = [...verMap].at(-1)![0];
        verMap.set(++lastLabelIndex, log);
        return;
      });

      return Array.from(verMap.entries()).map(
        ([key, { updatedAt, updatedBy, eTag }]) => ({
          label: `v${String(key)}`,
          value: eTag,
          updatedAt,
          updatedBy,
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly auditInfo$ = this.auditVersionControl.valueChanges.pipe(
    startWith(this.auditVersionControl.value),
    withLatestFrom(this.auditVersionOptions$),
    map(([ver, options]) => {
      if (Number.isNaN(ver)) {
        const option = options.at(-1);
        return {
          updatedAt: option?.updatedAt,
          updatedBy: option?.updatedBy,
        };
      }

      const option = options.find((opt) => opt.value === ver);
      return {
        updatedAt: option?.updatedAt,
        updatedBy: option?.updatedBy,
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected auditLastUpdated$ = this.auditInfo$.pipe(
    map((info) => info.updatedAt),
  );
  protected auditLastUpdatedBy$ = this.auditInfo$.pipe(
    map((info) => info.updatedBy),
  );

  // Helper methods to check if a field's path/sub-path exists in audit log
  isFormFieldChanged(path: string): boolean {
    if (!this.isAudit) return false;

    return this.auditVersionChangeLogPaths.some((logPath) => logPath === path);
  }

  isArrayFieldChanged(path: string): boolean {
    if (!this.isAudit) return false;

    return this.auditVersionChangeLogPaths.some((logPath) =>
      logPath.startsWith(path),
    );
  }

  isTransactionDetailsChanged(): boolean {
    return !this.auditVersionChangeLogPaths.every((logPath) =>
      ['/startingActions', '/completingActions'].some((action) =>
        logPath.startsWith(action),
      ),
    );
  }
}
