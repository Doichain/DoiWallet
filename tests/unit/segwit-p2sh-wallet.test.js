import assert from 'assert';
import * as bitcoin from "@doichain/doichainjs-lib";

import { SegwitP2SHWallet } from '../../class';
import { DOICHAIN } from '../../blue_modules/network';

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitP2SHWallet();
    wallet.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG');
    assert.strictEqual(wallet.getAddress(), '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());
    assert.strictEqual(await wallet.getAddressAsync(), wallet.getAddress());

    const utxos = [
      {
        txid: 'a56b44080cb606c0bd90e77fcd4fb34c863e68e5562e75b4386e611390eb860c',
        vout: 0,
        value: 300000,
      },
    ];

    let txNew = wallet.createTransaction(utxos, [{ value: 90000, address: '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz' }], 1, wallet.getAddress());
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    const satPerVbyte = txNew.fee / tx.virtualSize();
    assert.strictEqual(Math.round(satPerVbyte), 1);
    assert.strictEqual(
      txNew.tx.toHex(),
      '020000000001010c86eb9013616e38b4752e56e5683e864cb34fcd7fe790bdc006b60c08446ba500000000171600142359b9bd0cb14ce680e11362836e2c5a56bc96a7ffffffff02905f01000000000017a914013f386fb8e9dd4063a96ecf7f703d54bfbd108587a73303000000000017a914013f386fb8e9dd4063a96ecf7f703d54bfbd1085870247304402205dc8e8dd2faefe249d52b26a5109df306826b29778bde86ef5f1cee29cafb41402204c46e5d3b46549edb83a00520669d708e3fd97fa195cfa04c49b7bdb72354f01012102b58e16feba6b0ce28842b1a0aba18c85a5e945db84d0f6a3ba30b38edccfe97300000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz', bitcoin.address.fromOutputScript(tx.outs[0].script, DOICHAIN)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script, DOICHAIN), wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz' }], 1, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz', bitcoin.address.fromOutputScript(tx.outs[0].script, DOICHAIN)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'I4X/eco2cjmFb4L2+gts0RpUlMxaOQ9WJc40TSL6wQ5/UG9qbxhdnWqIoPqtcqmqx0j34ehWnoL6vUg3MvpqPuU=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });
});
