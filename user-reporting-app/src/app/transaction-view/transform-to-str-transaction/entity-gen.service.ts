import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import canonicalize from 'canonicalize';
import {
  catchError,
  from,
  map,
  Observable,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import {
  SEARCH_SOURCE_ID,
  TransactionSearchService,
} from '../../transaction-search/transaction-search.service';

@Injectable({
  providedIn: 'root',
})
export class EntityGenService {
  private readonly searchService = inject(TransactionSearchService);
  private readonly errorHandler = inject(ErrorHandler);

  generateEntity<T extends EntityGenType>(
    entity: Omit<T, 'entityIdentifier'>,
  ): Observable<T | null> {
    const clone = structuredClone(entity) as Omit<T, 'entityIdentifier'>;
    return this.enrichEntityData(clone).pipe(
      map((enriched) => this.ensureDiscriminator(enriched)),
      switchMap((unique) =>
        this.generateEntityHash(unique).pipe(
          map((hash) => ({ ...unique, entityIdentifier: hash }) as T),
        ),
      ),
      catchError((error: HttpErrorResponse) => {
        if (error.status === HttpStatusCode.NotFound) return of(null);
        return throwError(() => error);
      }),
    );
  }

  private enrichEntityData<T extends EntityGenType>(
    entity: Omit<T, 'entityIdentifier'>,
  ): Observable<Omit<T, 'entityIdentifier'>> {
    const { partyKey } = entity;
    if (!partyKey) return of(entity);

    return this.searchService.getPartyInfo(partyKey).pipe(
      map(
        (info) =>
          ({
            ...entity,
            surname: info.surname ?? null,
            givenName: info.givenName ?? null,
            otherOrInitialName: info.otherOrInitialName ?? null,
            nameOfEntity: info.nameOfEntity ?? null,
          }) as Omit<T, 'entityIdentifier'>,
      ),
    );
  }

  private generateEntityHash<T extends EntityGenType>(
    entity: Omit<T, 'entityIdentifier'>,
  ): Observable<string> {
    const hashInput = entity.partyKey?.trim()
      ? entity.partyKey.trim()
      : this.canonicalizeJcs(entity);
    return this.computeSHA256(hashInput);
  }

  private ensureDiscriminator<T extends EntityGenType>(
    entity: Omit<T, 'entityIdentifier'>,
  ): Omit<T, 'entityIdentifier'> {
    return this.hasOnlyName(entity)
      ? { ...entity, discriminatorKey: crypto.randomUUID() }
      : entity;
  }

  private hasOnlyName(
    entity: Omit<EntityGenType, 'entityIdentifier'>,
  ): boolean {
    const populated = Object.entries(entity).filter(
      ([, value]) => value != null && String(value).trim() !== '',
    );

    return (
      populated.length > 0 &&
      populated.every(([key]) => key.toLowerCase().includes('name'))
    );
  }

  private canonicalizeJcs(obj: unknown): string {
    const s = canonicalize(obj);
    if (!s)
      throw new Error(
        'Unable to canonicalize object for hashing (non-JSON value?)',
      );
    return s;
  }

  private computeSHA256(input: string): Observable<string> {
    const data = new TextEncoder().encode(input);
    return from(crypto.subtle.digest('SHA-256', data)).pipe(
      map((buffer) =>
        Array.from(new Uint8Array(buffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      ),
    );
  }
}

// Helper method to extract full name from party
export function getEntityFullName(
  entityName:
    | {
        surname?: string | null;
        givenName?: string | null;
        otherOrInitialName?: string | null;
        nameOfEntity?: string | null;
      }
    | undefined,
): string {
  if (!entityName) {
    return 'Unknown Entity';
  }

  // For entities
  if (entityName.nameOfEntity) {
    return entityName.nameOfEntity;
  }

  // For individuals - combine parts
  const parts = [
    entityName.givenName,
    entityName.otherOrInitialName,
    entityName.surname,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : 'Unknown Entity';
}

export type EntitySourceSystem = SEARCH_SOURCE_ID;

export interface EntityGenType {
  entityIdentifier: string;
  discriminatorKey?: string | null;
  sourceSystem?: EntitySourceSystem;

  // Identifiers
  partyKey?: string | null;
  certapayAccount?: string | null;
  msgTag50?: string | null;
  msgTag59?: string | null;
  cardNumber?: string | null;
  merchantPhone?: string | null;

  // Name
  surname?: string | null;
  givenName?: string | null;
  otherOrInitialName?: string | null;
  nameOfEntity?: string | null;
  rawName?: string | null;
  displayName?: string | null;

  // Account
  fiNumber?: string | null;
  accountNumber?: string | number | null;
  transitNumber?: string | number | null;
  currency?: string | null;
  accountName?: string | null;

  // Contact
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  handleUsed?: string | null;
  contactIdentifier?: string | null;
  contactName?: string | null;

  // Address
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  provinceState?: string | null;
  provinceCode?: string | null;
  country?: string | null;
  rawAddress?: string | null;
}
