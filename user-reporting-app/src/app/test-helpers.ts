import { HarnessLoader } from '@angular/cdk/testing';
import { DebugElement } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { MatExpansionPanelHarness } from '@angular/material/expansion/testing';
import { MatTabHarness } from '@angular/material/tabs/testing';
import { By } from '@angular/platform-browser';
import { defer } from 'rxjs';

export type DeepPartial<T> = {
  [P in keyof T]?: Exclude<T[P], null | undefined> extends (infer U)[]
    ? DeepPartial<U>[] | null
    : T[P] extends object
      ? DeepPartial<T[P]> | null
      : T[P] | null;
};

export function findEl<T>(
  fixture: ComponentFixture<T>,
  testId: string,
): DebugElement {
  return fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
}

/**
 * Create async observable that emits-once and completes
 * after a JS engine turn
 */
export function asyncData<T>(data: T) {
  return defer(() => Promise.resolve(data));
}

/**
 * Create async observable error that errors
 * after a JS engine turn
 */
export function asyncError<T>(errorObject: any) {
  return defer(() => Promise.reject(errorObject));
}

/**
 * mat-tab, mat-expansion-panel elements are hidden by default until activated. The harness can't find fields that aren't rendered in the DOM.
 * requires mat-tab-group preserveContent
 */
export async function activateTabs(loader: HarnessLoader) {
  const tabHarnesses = await loader.getAllHarnesses(MatTabHarness);
  for (const tab of tabHarnesses) {
    await tab.select();
  }

  const panels = await loader.getAllHarnesses(MatExpansionPanelHarness);
  for (const panel of panels) {
    if (!(await panel.isExpanded())) {
      await panel.expand();
    }
  }
}
