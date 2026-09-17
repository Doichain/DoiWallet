import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from '../../class';

jest.setTimeout(30 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('LegacyWallet', function () {
  it('can serialize and unserialize correctly', () => {
    const a = new LegacyWallet();
    a.setLabel('my1');
    const key = JSON.stringify(a);

    const b = LegacyWallet.fromJson(key);
    assert.strictEqual(b.type, LegacyWallet.type);
    assert.strictEqual(key, JSON.stringify(b));
  });

  it('can fetch balance', async () => {
    const w = new LegacyWallet();
    w._address = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e'; // hack internals
    assert.ok(w.weOwnAddress('N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e'));
    assert.ok(!w.weOwnAddress('aaa'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    assert.ok(w.getBalance() === 0);
    assert.ok(w.getUnconfirmedBalance() === 0);
    assert.ok(w._lastBalanceFetch === 0);
    await w.fetchBalance();   
    assert.ok(w.getBalance() === 9948820);
    assert.ok(w.getUnconfirmedBalance() === 0);
    assert.ok(w._lastBalanceFetch > 0);
  });

  it('can fetch TXs and derive UTXO from them', async () => {
    const w = new LegacyWallet();
    w._address = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e';
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.value);
      assert.ok(tx.received);
      assert.ok(tx.confirmations! > 1);
    }

    assert.ok(w.weOwnTransaction('9e972369a17c468bfcebf67c3fe11b90222959023685ecfa73024bcb3677f2d7'));
    assert.ok(!w.weOwnTransaction('ffeadec08bbe7b21bf7cc50317b037f30db6923604e2ccf6a56a97e7efc07753'));

    assert.strictEqual(w.getUtxo().length, 2);

    for (const tx of w.getUtxo()) {
      assert.strictEqual(tx.txid, '9e972369a17c468bfcebf67c3fe11b90222959023685ecfa73024bcb3677f2d7');
      //assert.strictEqual(tx.vout, 1);
      assert.strictEqual(tx.address, 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e');
      //assert.strictEqual(tx.value, 1000000);
      assert.ok(tx.confirmations! > 0);
    }
  });

  it.each([
    // Transaction with missing address output https://www.blockchain.com/btc/tx/d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d
    ['addresses for vout missing', 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e'],
    // ['txdatas were coming back null from BlueElectrum because of high batchsize', '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo'],
    // skipped because its slow and flaky if being run in pack with other electrum tests. uncomment and run single
    // if you need to debug huge electrum batches
  ])(
    'can fetch TXs when %s',
    async (useCase, address) => {
      const w = new LegacyWallet();
      w._address = address;
      await w.fetchTransactions();

      assert.ok(w.getTransactions().length > 0);
      for (const tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.received);
        assert.ok(tx.confirmations! > 1);
      }
    },
    240000,
  );

  it('can fetch UTXO', async () => {
    const w = new LegacyWallet();
    w._address = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e';
    await w.fetchUtxo();
    assert.ok(w._utxo.length > 0, 'unexpected empty UTXO');
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    //assert.ok(w.getUtxo()[0].vout === 1, JSON.stringify(w.getUtxo()[0]));
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations);
    assert.ok(w.getUtxo()[0].txhex);
  });
});

describe('SegwitP2SHWallet', function () {
  it('can generate segwit P2SH address from WIF', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG');
    assert.ok(l.getAddress() === '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz', 'expected ' + l.getAddress());
    assert.ok(l.getAddress() === (await l.getAddressAsync()));
    assert.ok(l.weOwnAddress('6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz'));
    assert.ok(!l.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!l.weOwnAddress(false));
  });
});

describe('SegwitBech32Wallet', function () {
  it('can fetch balance', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p';
    assert.ok(w.weOwnAddress('dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p'));
    assert.ok(w.weOwnAddress('dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p'));
    assert.ok(!w.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 0);
  });

  it('can fetch UTXO', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk';
    await w.fetchUtxo();
    const l1 = w.getUtxo().length;
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    assert.ok(w.getUtxo()[0].vout === 0);
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations, JSON.stringify(w.getUtxo()[0], null, 2));
    // double fetch shouldnt duplicate UTXOs:
    await w.fetchUtxo();
    const l2 = w.getUtxo().length;
    assert.strictEqual(l1, l2);
  });

  it('can fetch TXs LegacyWallet', async () => {
    const w = new LegacyWallet();
    w._address = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e';
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.value);
      assert.ok(tx.received);
      assert.ok(tx.confirmations! > 1);
    }

    assert.strictEqual(w.getTransactions()[0].value, -51180);
    assert.strictEqual(w.getTransactions()[1].value, 10000000);
  });

  it('can fetch TXs SegwitBech32Wallet', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt';
    assert.ok(w.weOwnAddress('dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt'));
    assert.ok(w.weOwnAddress('dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt'));
    assert.ok(!w.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
    const tx = w.getTransactions()[1];
    assert.ok(tx.hash);
    assert.strictEqual(tx.value, 39976496);
    assert.ok(tx.received);
    assert.ok(tx.confirmations! > 1);

    const tx0 = w.getTransactions()[0];
    assert.ok(tx0.inputs);
    assert.ok(tx0.inputs.length === 1);
    assert.ok(tx0.outputs);
    assert.ok(tx0.outputs.length === 2);

    assert.ok(w.weOwnTransaction('6bdda50ab68552cbfba946ed01c8819624ccd8ff57c7a39bf66fcf4bd8ce524b'));
    assert.ok(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881'));
  });
});
