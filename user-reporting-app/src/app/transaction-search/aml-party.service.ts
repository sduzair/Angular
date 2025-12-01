import { Injectable } from '@angular/core';
import { map, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AmlPartyService {
  getPartyAccountInfoByAmlId(amlId: string) {
    return timer(1000).pipe(
      map(() => ({
        amlId: '99999999',
        partyKeys: [
          {
            partyKey: '3415674561',
            accountModels: [
              { accountTransit: '84255', accountNumber: '5582195' },
              { accountTransit: '31980', accountNumber: '8692413' },
              { accountTransit: '87594', accountNumber: '5647218' },
              {
                accountNumber: '4242424242424242',
              },
            ],
          },
          {
            partyKey: '1846597320',
            accountModels: [
              { accountTransit: '84255', accountNumber: '5582195' },
              { accountTransit: '31980', accountNumber: '8692413' },
              { accountTransit: '87594', accountNumber: '5647218' },
              {
                accountNumber: '5555555555554444',
              },
            ],
          },
        ],
      })),
    );
  }
}
