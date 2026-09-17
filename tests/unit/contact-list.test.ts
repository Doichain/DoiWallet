import assert from 'assert';

import { ContactList } from '../../class/contact-list';

describe('ContactList', () => {
  it('isAddressValid()', () => {
    const cl = new ContactList();
    assert.ok(cl.isAddressValid('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP'));
    assert.ok(cl.isAddressValid('dc1qvtztrf6zpxffxgfeewd9aq2ytzuny5yjepecen'));
    

    assert.ok(!cl.isAddressValid('sfhsdhsdf'));
  });

  it('isPaymentCodeValid()', async () => {
    const cl = new ContactList();

    assert.ok(!cl.isPaymentCodeValid('sfdgsfdghsfd'));
    assert.ok(
      cl.isPaymentCodeValid(
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
      ),
    );

    assert.ok(
      cl.isPaymentCodeValid(
        'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv',
      ),
    );

    assert.ok(!cl.isPaymentCodeValid('sp1qq'));
  });
});
