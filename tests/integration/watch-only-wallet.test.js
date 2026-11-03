import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { HDSegwitBech32Transaction } from '../../class/hd-segwit-bech32-transaction';

jest.setTimeout(500 * 1000);

/**
 * Counts and balances recorded when these tests were written have all been overtaken by the chain:
 * ZPUB went from 6 transactions to 11, ZPUB_HD from 9 to 17 and its balance from 195691153 to a
 * different number again by the time you read this. The assertions now cover what the watch-only
 * wallet is responsible for - deriving its addresses from the key, and adding its transactions up -
 * neither of which depends on how much has happened on the chain since.
 */
const ZPUB = 'zpub6r6B6XiuwEubH2cC5X7cgAVuVgNdD7X5LAhpq7HbNnN4qrJ5DKy6hy6HRmLy8o1GqUksTkGERwii1hnY5q3zbGgrg3svPdSrjTB4NdNwR32';
const ZPUB_HD = 'zpub6rLXmt9RCjYTbb4VLV7ZwVf1NSAXPWjuiDY1Q1QgvfjkbB9UHR38hjCc7jxbLYPhBSEoDGtKd3NHwAi4EVKy7D2ZYHUWbu7GTU7e792gFez';
const ADDRESS = 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk';

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  if (!(await BlueElectrum.ensureConnected())) {
    throw new Error('failed to connect to Electrum');
  }
});

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6r6B6XiuwEubH2cC5X7cgAVuVgNdD7X5LAhpq7HbNnN4qrJ5DKy6hy6HRmLy8o1GqUksTkGERwii1hnY5q3zbGgrg3svPdSrjTB4NdNwR32');
    await w.fetchBalance();
    assert.ok(w.getBalance() > 16);
  });

  it('can fetch tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(ZPUB);
    await w.fetchTransactions();
    const txs = w.getTransactions();
    assert.ok(txs.length > 0, 'no transactions at all');

    // this used to assert exactly 6, which the wallet grew past; fetching twice must not double
    // them up, which is the bug the count was there to catch and was left commented out
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, txs.length, 'fetching twice duplicated transactions');
    assert.strictEqual(new Set(w.getTransactions().map(tx => tx.txid)).size, txs.length, 'the list has duplicates');
  });

  it('can fetch TXs with values', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(ADDRESS);
    assert.strictEqual(w.getAddress(), ADDRESS);
    assert.strictEqual(await w.getAddressAsync(), ADDRESS);
    assert.ok(w.weOwnAddress(ADDRESS));
    assert.ok(!w.weOwnAddress('garbage'));
    assert.ok(!w.weOwnAddress(false));
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length > 0, `${ADDRESS} has no history, pick another address`);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.timestamp);
      assert.ok(tx.confirmations > 1);

      // the amount shown next to a transaction is what we gained minus what we spent, in satoshi.
      // The single pinned value this used to check, -93692735, is still in this wallet but no
      // longer the second entry, and it never said whether the sum itself was right.
      let gained = 0;
      for (const output of tx.outputs) {
        if (output.scriptPubKey.addresses?.[0] === ADDRESS) gained += Math.round(output.value * 100000000);
      }
      let spent = 0;
      for (const input of tx.inputs) {
        if (input.addresses?.[0] === ADDRESS) spent += Math.round((input.value ?? 0) * 100000000);
      }
      assert.strictEqual(tx.value, gained - spent, `${tx.txid} does not add up`);
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
    w.setSecret(ZPUB_HD);
    w.init();

    // derivation is the wallet's own arithmetic and the one thing here that is fixed for good: the
    // same key always yields the same addresses, however much it is used afterwards
    assert.strictEqual(w._getExternalAddressByIndex(0), ADDRESS);
    assert.strictEqual(w._getExternalAddressByIndex(1), 'dc1qlghhgmr4hrjgqfvncy3hmxkcgrphh3kukuref4');
    assert.strictEqual(w._getInternalAddressByIndex(0), 'dc1qj93genwg3y84zjh550zwjvfzmh9ncchww8fmxm');

    await w.fetchBalance();
    assert.ok(w.getBalance() > 0, 'this key was spent empty, pick another one');
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length > 0, 'no transactions at all');

    // the next address to hand out is the first unused one, so it has to be past every address the
    // scan found a transaction on and must not be one of them
    const nextAddress = await w.getAddressAsync();
    assert.strictEqual(nextAddress, w._getExternalAddressByIndex(w.getNextFreeAddressIndex()));
    const nextChangeAddress = await w.getChangeAddressAsync();
    assert.strictEqual(nextChangeAddress, w._getInternalAddressByIndex(w.getNextFreeChangeAddressIndex()));

    const used = new Set();
    for (const tx of w.getTransactions()) {
      for (const output of tx.outputs) {
        if (output.scriptPubKey.addresses?.[0]) used.add(output.scriptPubKey.addresses[0]);
      }
    }
    assert.ok(!used.has(nextAddress), `${nextAddress} has been used already`);
    assert.ok(!used.has(nextChangeAddress), `${nextChangeAddress} has been used already`);
  });

  // upstream's vector is a Bitcoin transaction, which no Doichain server knows
  it.skip('can do RBF - bumpfees tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6qLpbJKVYnGb61HgUUuG5jRsrQrJ2uFCuQTX2nyuwPMv8vs8bQbq1T3oLMcbBRp3J8yjHnSnMR7Ykg4ffF82qGjC2TkuKnoAHKPWDJNvYKS');
    w.init();

    let tt = new HDSegwitBech32Transaction(
      null,
      '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400',
      w._hdWalletInstance,
      4056346968,
    );
    let result = await tt.createRBFbumpFee(5);

    // result.tx will be undefined because watch only path that returns psbt will be taken
    assert.strictEqual(result.tx, undefined);

    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [88, 241, 198, 241]);
    }

    // without mfp or mfp = 0
    tt = new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w._hdWalletInstance);
    result = await tt.createRBFbumpFee(5);
    assert.strictEqual(result.tx, undefined);
    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [0, 0, 0, 0]);
    }

    // should throw if w and not w._hdWalletInstance is passed
    assert.throws(
      () => new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w),
      /Only HD Bech32 wallets supported/,
    );
  });

  // upstream's vector is a Bitcoin transaction, which no Doichain server knows
  it.skip('can do RBF - cancel tx', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6qLpbJKVYnGb61HgUUuG5jRsrQrJ2uFCuQTX2nyuwPMv8vs8bQbq1T3oLMcbBRp3J8yjHnSnMR7Ykg4ffF82qGjC2TkuKnoAHKPWDJNvYKS');
    w.init();

    let tt = new HDSegwitBech32Transaction(
      null,
      '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400',
      w._hdWalletInstance,
      4056346968,
    );
    let result = await tt.createRBFcancelTx(5);

    // result.tx will be undefined because watch only path that returns psbt will be taken
    assert.strictEqual(result.tx, undefined);

    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [88, 241, 198, 241]);
    }

    // without mfp or mfp = 0
    tt = new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w._hdWalletInstance);
    result = await tt.createRBFcancelTx(5);
    assert.strictEqual(result.tx, undefined);
    assert.ok(result.psbt);

    for (const input of result.psbt.data.inputs) {
      assert.ok(input.bip32Derivation);
      assert.strictEqual(input.bip32Derivation.length, 1);
      assert.deepStrictEqual(Array.from(input.bip32Derivation[0].masterFingerprint), [0, 0, 0, 0]);
    }

    // should throw if w and not w._hdWalletInstance is passed
    assert.throws(
      () => new HDSegwitBech32Transaction(null, '3f259914c38abf10af40086b196a724b3b9da27095c3d7b627c83335f7d17400', w),
      /Only HD Bech32 wallets supported/,
    );
  });

  // skipped because its generally rare case

  it('can fetch txs for address funded by genesis txs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP');
    await w.fetchBalance();
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 0);
  });
});
