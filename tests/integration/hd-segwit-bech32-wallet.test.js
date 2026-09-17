import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { HDSegwitBech32Wallet } from '../../class';

jest.setTimeout(90 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Bech32 Segwit HD (BIP84)', () => {
  it.each([false, true])('can fetch balance, transactions & utxo, disableBatching=%p', async function (disableBatching) {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }
    if (disableBatching) BlueElectrum.setBatchingDisabled();

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(hd.validateMnemonic());

    assert.strictEqual(
      'zpub6rL1xXSsKPjTwhcxN6dSc3rbtJHLiWrkqGYmwqQRSjLjVTcZqxPD1myJrxz6tKeAEQz6uweWxUcMGxkQQ3wZjerL5rKYGRq3Cjt8XDA2ZVK',
      hd.getXpub(),
    );


    assert.strictEqual(hd._getExternalAddressByIndex(0), 'dc1qvtztrf6zpxffxgfeewd9aq2ytzuny5yjepecen');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'dc1qcxz3hc7uj3d74524qah3p3ce3qkj55k8m6329g');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'dc1q03unpflnvrsxyl7r35qsfevhdlqhmkh6ux2uy9');
    assert.strictEqual(hd._getInternalAddressByIndex(1), 'dc1qsxvnvs7amwwuvdnmm9nvku5r9s93xd0ju2xnu4');

    assert.ok(hd.weOwnAddress('dc1qvtztrf6zpxffxgfeewd9aq2ytzuny5yjepecen'));
    assert.ok(hd.weOwnAddress('dc1qcxz3hc7uj3d74524qah3p3ce3qkj55k8m6329g'));
    assert.ok(hd.weOwnAddress('dc1q03unpflnvrsxyl7r35qsfevhdlqhmkh6ux2uy9'));
    assert.ok(!hd.weOwnAddress('1HjsSTnrwWzzEV2oi4r5MsAYENkTkrCtwL'));
    assert.ok(!hd.weOwnAddress('garbage'));
    assert.ok(!hd.weOwnAddress(false));

    assert.strictEqual(hd.timeToRefreshBalance(), true);
    assert.ok(hd._lastTxFetch === 0);
    assert.ok(hd._lastBalanceFetch === 0);

    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), 0);
    //assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(2));
    //assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(2));
    assert.strictEqual(hd.next_free_address_index, 0);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 0);
    assert.strictEqual(hd.next_free_change_address_index, 0);

    // now fetch txs
    await hd.fetchTransactions();
    assert.ok(hd._lastTxFetch > 0);
    assert.ok(hd._lastBalanceFetch > 0);
    assert.strictEqual(hd.timeToRefreshBalance(), false);
    assert.strictEqual(hd.getTransactions().length, 0);

    for (const tx of hd.getTransactions()) {
      assert.ok(tx.hash);
      assert.strictEqual(tx.value, 50000);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }

  //  assert.ok(hd.weOwnTransaction('8ceed4a08ca6e855a7a1c1d63a484b7b91b08c760ff0418b54d3fbe598062d1b'));
  //  assert.ok(hd.weOwnTransaction('7b81fabc289b914afc0c5784c93588daedb30e7713477935dd5ba52027b64745'));
  //  assert.ok(!hd.weOwnTransaction('8732248ddf80183424f91be5580baa69eeeaecf13d6e41225c0d3837f977bc9e'));

    // now fetch UTXO
    await hd.fetchUtxo();
    const utxo = hd.getUtxo();
    assert.strictEqual(utxo.length, 0);
  //  assert.ok(utxo[0].txid);
   // assert.ok(utxo[0].vout === 0 || utxo[0].vout === 1);
   // assert.ok(utxo[0].value);
   // assert.ok(utxo[0].address);

    // now, reset HD wallet, and find free addresses from scratch:
    hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);

    assert.strictEqual(await hd.getAddressAsync(), hd._getExternalAddressByIndex(0));
    assert.strictEqual(await hd.getChangeAddressAsync(), hd._getInternalAddressByIndex(0));
    assert.strictEqual(hd.next_free_address_index, 0);
    assert.strictEqual(hd.getNextFreeAddressIndex(), 0);
    assert.strictEqual(hd.next_free_change_address_index, 0);
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });

  // skpped because its a very specific testcase, and slow
  // unskip and test manually
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can catch up with externally modified wallet', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());

    await hd.fetchBalance();
    const oldBalance = hd.getBalance();

    await hd.fetchTransactions();
    const oldTransactions = hd.getTransactions();

    // now, mess with internal state, make it 'obsolete'

    hd._txs_by_external_index['2'].pop();
    hd._txs_by_internal_index['16'].pop();
    hd._txs_by_internal_index['17'] = [];

    for (let c = 17; c < 100; c++) hd._balances_by_internal_index[c] = { c: 0, u: 0 };
    hd._balances_by_external_index['2'].c = 1000000;

    assert.ok(hd.getBalance() !== oldBalance);
    assert.ok(hd.getTransactions().length !== oldTransactions.length);

    // now, refetch! should get back to normal

    await hd.fetchBalance();
    assert.strictEqual(hd.getBalance(), oldBalance);
    await hd.fetchTransactions();
    assert.strictEqual(hd.getTransactions().length, oldTransactions.length);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('can work with faulty zpub', async () => {
    // takes too much time, skipped
    if (!process.env.FAULTY_ZPUB) {
      console.error('process.env.FAULTY_ZPUB not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd._xpub = process.env.FAULTY_ZPUB;

    await hd.fetchBalance();
    await hd.fetchTransactions();

    assert.ok(hd.getTransactions().length >= 76);
  });

  it.skip('can fetchBalance, fetchTransactions, fetchUtxo and create transactions', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'zpub6rL1xXSsKPjTwhcxN6dSc3rbtJHLiWrkqGYmwqQRSjLjVTcZqxPD1myJrxz6tKeAEQz6uweWxUcMGxkQQ3wZjerL5rKYGRq3Cjt8XDA2ZVK',
    );

    let start = +new Date();
    await hd.fetchBalance();
    let end = +new Date();
    end - start > 5000 && console.warn('fetchBalance took', (end - start) / 1000, 'sec');

    assert.ok(hd.next_free_change_address_index === 0);    
    assert.ok(hd.next_free_address_index === 0);
    assert.ok(hd.getNextFreeAddressIndex() === 0);

    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 15000 && console.warn('fetchTransactions took', (end - start) / 1000, 'sec');

    start = +new Date();
    await hd.fetchBalance();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchBalance took', (end - start) / 1000, 'sec');

    global.debug = true;
    start = +new Date();
    await hd.fetchTransactions();
    end = +new Date();
    end - start > 2000 && console.warn('warm fetchTransactions took', (end - start) / 1000, 'sec');

    let txFound = 0;
    for (const tx of hd.getTransactions()) {
      if (tx.hash === 'e9ef58baf4cff3ad55913a360c2fa1fd124309c59dcd720cdb172ce46582097b') {
        assert.strictEqual(tx.value, -129545);
        assert.strictEqual(tx.inputs[0].addresses[0], 'bc1qffcl35r05wyf06meu3dalfevawx559n0ufrxcw');
        assert.strictEqual(tx.inputs[1].addresses[0], 'bc1qtvh8mjcfdg9224nx4wu3sw7fmmtmy2k3jhdeul');
        assert.strictEqual(tx.inputs[2].addresses[0], 'bc1qhe03zgvq4fmfw8l2qq2zu4dxyhgyukcz6k2a5w');
        txFound++;
      }
      if (tx.hash === 'e112771fd43962abfe4e4623bf788d6d95ff1bd0f9b56a6a41fb9ed4dacc75f1') {
        assert.strictEqual(tx.value, 1000000);
        assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        assert.strictEqual(tx.inputs[1].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
      if (tx.hash === 'c94bdec21c72d3441245caa164b00315b131f6b72513369f4be1b00b9fb99cc5') {
        assert.strictEqual(tx.inputs[0].addresses[0], '16Nf5X77RbFz9Mb6t2GFqxs3twQN1joBkD');
        txFound++;
      }
      if (tx.hash === '51fc225ddf24f7e124f034637f46442645ca7ea2c442b28124d4bcdd04e30195') {
        assert.strictEqual(tx.inputs[0].addresses[0], '3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
        txFound++;
      }
    }
    assert.strictEqual(txFound, 4);

    await hd.fetchUtxo();
    assert.strictEqual(hd.getUtxo().length, 4);
    assert.strictEqual(hd.getDerivedUtxoFromOurTransaction().length, 4);
    const u1 = hd.getUtxo().find(utxo => utxo.txid === '8b0ab2c7196312e021e0d3dc73f801693826428782970763df6134457bd2ec20');
    const u2 = hd
      .getDerivedUtxoFromOurTransaction()
      .find(utxo => utxo.txid === '8b0ab2c7196312e021e0d3dc73f801693826428782970763df6134457bd2ec20');
    delete u1.confirmations;
    delete u2.confirmations;
    delete u1.height;
    delete u2.height;
    assert.deepStrictEqual(u1, u2);
    const changeAddress = await hd.getChangeAddressAsync();
    assert.ok(changeAddress && changeAddress.startsWith('bc1'));

    const { tx, inputs, outputs, fee } = hd.createTransaction(
      hd.getUtxo(),
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 51000 }],
      13,
      changeAddress,
    );

    assert.strictEqual(Math.round(fee / tx.virtualSize()), 13);

    let totalInput = 0;
    for (const inp of inputs) {
      totalInput += inp.value;
    }

    assert.strictEqual(outputs.length, 2);
    let totalOutput = 0;
    for (const outp of outputs) {
      totalOutput += outp.value;
    }

    assert.strictEqual(totalInput - totalOutput, fee);
    assert.strictEqual(outputs[outputs.length - 1].address, changeAddress);
  });

  it.skip('wasEverUsed() works', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.HD_MNEMONIC);
    assert.ok(await hd.wasEverUsed());

    hd = new HDSegwitBech32Wallet();
    await hd.generate();
    assert.ok(!(await hd.wasEverUsed()), hd.getSecret());
  });
});
