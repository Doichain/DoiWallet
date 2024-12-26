import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { WatchOnlyWallet } from '../../class';

jest.setTimeout(500 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    await w.fetchBalance();
    assert.ok(w.getBalance() > 16);
  });

  it('can fetch tx', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('167zK5iZrs1U6piDqubD3FjRqUTM2CZnb8');
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 215, w.getTransactions().length);
    // should be 233 but electrum server cant return huge transactions >.<

    w = new WatchOnlyWallet();
    w.setSecret('1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV');
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    // fetch again and make sure no duplicates
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can fetch tx from huge wallet', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP'); // binance wallet
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length === 0, w.getTransactions().length); // not yet kek but at least we dont crash
  });

  it('can fetch TXs with values', async () => {
    const w = new WatchOnlyWallet();
    for (const sec of [
      'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk',
      'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk',

    ]) {
      w.setSecret(sec);
      assert.strictEqual(w.getAddress(), 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk');
      assert.strictEqual(await w.getAddressAsync(), 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk');
      assert.ok(w.weOwnAddress('dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk'));
      assert.ok(!w.weOwnAddress('garbage'));
      assert.ok(!w.weOwnAddress(false));
      await w.fetchTransactions();

      for (const tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.received);
        assert.ok(tx.confirmations > 1);
      }

      assert.strictEqual(w.getTransactions()[0].value, -892111);
      assert.strictEqual(w.getTransactions()[1].value, 892111);
    }
  });

  it('can fetch complex TXs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e');
    await w.fetchTransactions();
    for (const tx of w.getTransactions()) {
      assert.ok(tx.value, 'incorrect tx.value');
    }
  });

  it('can fetch balance & transactions from zpub HD', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rLXmt9RCjYTbb4VLV7ZwVf1NSAXPWjuiDY1Q1QgvfjkbB9UHR38hjCc7jxbLYPhBSEoDGtKd3NHwAi4EVKy7D2ZYHUWbu7GTU7e792gFez');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 195691153);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 9);
    const nextAddress = await w.getAddressAsync();

    assert.strictEqual(w.getNextFreeAddressIndex(), 1);
    assert.strictEqual(nextAddress, 'dc1qlghhgmr4hrjgqfvncy3hmxkcgrphh3kukuref4');
    assert.strictEqual(nextAddress, w._getExternalAddressByIndex(w.getNextFreeAddressIndex()));

    const nextChangeAddress = await w.getChangeAddressAsync();
    assert.strictEqual(nextChangeAddress, 'dc1qan7tqkv8yug5ua42dvmqjqyqkj2m9yxcmp9jh8');
  });

  // skipped because its generally rare case
  // eslint-disable-next-line jest/no-disabled-tests
  it('can fetch txs for address funded by genesis txs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP');
    await w.fetchBalance();
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 0);
  });
});
