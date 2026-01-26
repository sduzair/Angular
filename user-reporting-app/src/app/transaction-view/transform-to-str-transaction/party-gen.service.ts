import { inject, Injectable } from '@angular/core';
import { from, map, Observable, of, switchMap } from 'rxjs';
import {
  SEARCH_SOURCE_ID,
  TransactionSearchService,
} from '../../transaction-search/transaction-search.service';

@Injectable({
  providedIn: 'root',
})
export class PartyGenService {
  private readonly searchService = inject(TransactionSearchService);

  /**
   * Creates or updates a UnifiedParty with a generated hash.
   * Hash generation priority:
   * 1. If partyKey exists, hash only partyKey
   * 2. Otherwise, hash the entire party object
   */
  generateParty(
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ): Observable<PartyGenType> {
    return this.enrichPartyData(party).pipe(
      map((enrichedParty) => this.ensureDiscriminatorIfNeeded(enrichedParty)),
      switchMap((partyWithDiscriminator) =>
        this.generateUnifiedPartyHash(partyWithDiscriminator).pipe(
          map((hash) => ({
            ...partyWithDiscriminator,
            partyIdentifier: hash,
          })),
        ),
      ),
    );
  }

  /**
   * Fetches additional party information if partyKey exists.
   * Returns observable of enriched party data.
   */
  private enrichPartyData(
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ): Observable<Omit<PartyGenType, 'partyIdentifier'>> {
    const partyKey = party.identifiers?.partyKey;

    if (!partyKey || partyKey === '') {
      return of(party);
    }

    return this.searchService.getPartyInfo(String(partyKey)).pipe(
      map((partyInfo) => {
        return {
          ...party,
          identifiers: { ...party.identifiers, partyKey: String(partyKey) },
          partyName: {
            surname: partyInfo.surname || null,
            givenName: partyInfo.givenName || null,
            otherOrInitial: partyInfo.otherOrInitial || null,
            nameOfEntity: partyInfo.nameOfEntity || null,
          },
        } satisfies Omit<PartyGenType, 'partyIdentifier'>;
      }),
    );
  }

  /**
   * Generates a deterministic hash for the unified party.
   */
  private generateUnifiedPartyHash(
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ): Observable<string> {
    let hashInput: string;

    // if partyKey exists, use only that
    if (
      party.identifiers?.partyKey != null &&
      party.identifiers.partyKey !== ''
    ) {
      hashInput = String(party.identifiers.partyKey).trim();
    }
    // else hash entire party object
    else {
      hashInput = this.serializeObject(party);
    }

    return this.computeSHA256(hashInput);
  }

  /**
   * Ensures a discriminator key is added if not enough subject info (no identifiers are present).
   */
  private ensureDiscriminatorIfNeeded(
    party: Omit<PartyGenType, 'partyIdentifier'>,
  ): Omit<PartyGenType, 'partyIdentifier'> {
    if (!this.hasAnyIdentifiers(party.identifiers) && !party.discriminatorKey) {
      return {
        ...party,
        discriminatorKey: crypto.randomUUID(),
      };
    }
    return party;
  }

  /**
   * Checks if any meaningful identifiers exist.
   */
  private hasAnyIdentifiers(identifiers?: PartyIdentifiers): boolean {
    if (!identifiers) return false;

    return !!(
      (identifiers.partyKey != null && identifiers.partyKey !== '') ||
      identifiers.certapayAccount ||
      identifiers.msgTag50 ||
      identifiers.msgTag59 ||
      identifiers.cardNumber
    );
  }

  /**
   * Serializes entire object into deterministic JSON string.
   * Sorts keys to ensure consistent hashing regardless of property order.
   */
  private serializeObject(obj: unknown): string {
    return JSON.stringify(obj, this.sortedReplacer());
  }

  /**
   * Replacer function that sorts object keys for deterministic JSON.stringify.
   */
  private sortedReplacer(): (key: string, value: unknown) => unknown {
    return (key: string, value: unknown) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce(
            (sorted, key) => {
              // eslint-disable-next-line no-param-reassign
              sorted[key] = (value as Record<string, unknown>)[key];
              return sorted;
            },
            {} as Record<string, unknown>,
          );
      }
      return value;
    };
  }

  /**
   * Computes SHA-256 hash using Web Crypto API.
   * Returns observable of hash string.
   */
  private computeSHA256(input: string): Observable<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    return from(crypto.subtle.digest('SHA-256', data)).pipe(
      map((hashBuffer) =>
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      ),
    );
  }
}

export type PartySourceSystem = SEARCH_SOURCE_ID;

// Identifiers that show up across source systems
export interface PartyIdentifiers {
  partyKey?: string | null;
  certapayAccount?: string | null; // EMT sender/recipient certapay account
  msgTag50?: string | null; // Wire Ordering Customer (Payer)
  msgTag59?: string | null; // Wire Beneficiary
  cardNumber?: string | null;
}

export interface PartyAccount {
  fiNumber?: string | null; // senderFiNumber/recipientFiNumber, strCaFiNumber, etc.
  accountNumber?: string | number | null;
  transitNumber?: string | number | null;
  currency?: string | null;
  accountName?: string | null;
}

export interface PartyName {
  surname?: string | null;
  givenName?: string | null;
  otherOrInitial?: string | null;
  nameOfEntity?: string | null;

  rawName?: string | null;
  displayName?: string | null;
}

export interface PartyContact {
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;

  // EMT-specific
  handleUsed?: string | null;
  contactIdentifier?: string | null;
  contactName?: string | null;
}

export interface PartyAddress {
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  provinceState?: string | null;
  country?: string | null;
  rawAddress?: string | null; // e.g., wire payerAddress/payeeAddress if not parsed
}

/**
 * Unified party/subject model.
 */
export interface PartyGenType {
  partyIdentifier: string;
  /**
   * Used as a fallback for insufficient subject info
   */
  discriminatorKey?: string | null;
  // Provenance (where this party instance came from)
  sourceSystem?: PartySourceSystem;

  identifiers?: PartyIdentifiers;
  account?: PartyAccount;
  partyName?: PartyName;
  contact?: PartyContact;
  address?: PartyAddress;
}
