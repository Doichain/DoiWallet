import BIP47Factory, { NetworkCoin } from '@spsina/bip47';
import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import { ECPairFactory } from 'ecpair';
import { DOICHAIN } from '../../blue_modules/network.js';

import ecc from '../../blue_modules/noble_ecc';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { CreateTransactionUtxo } from '../../class/wallets/types';
import { Network } from '@keystonehq/bc-ur-registry';

const ECPair = ECPairFactory(ecc);

describe('Bech32 Segwit HD (BIP84) with BIP47', () => {
  it('should work', async () => {
    const bobWallet = new HDSegwitBech32Wallet();
    // @see https://gist.github.com/SamouraiDev/6aad669604c5930864bd
    //bobWallet.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');
    bobWallet.setSecret('coil earn raccoon party result public shrug corn scrap field security devote');
    
    expect(bobWallet.getBIP47PaymentCode()).toEqual(
      'PM8TJS7d8ryvmPTk57d7NYJug8eLQpHHdmfcHidoBqqXgqMdjW56SBaK5R9wSSj5bRjhrVafyUBpgpdGqT7Si2XWQSu8zPxnWsjCyKwo5Mog1mGUo3as',
    );
    assert.strictEqual(bobWallet.getBIP47NotificationAddress(), 'N3dqeUC6Sz15PqJ2qfvVrbCTN42nY9avqF'); // our notif address
    assert.ok(!bobWallet.weOwnAddress('184USph7XbuWsJ3XZrbve53YdpdjYjUXoG')); // alice notif address, we dont own it
  });

  it('getters, setters, flags work', async () => {
    const w = new HDSegwitBech32Wallet();
    await w.generate();

    expect(w.allowBIP47()).toEqual(true);

    expect(w.isBIP47Enabled()).toEqual(false);
    w.switchBIP47(true);
    expect(w.isBIP47Enabled()).toEqual(true);
    w.switchBIP47(false);
    expect(w.isBIP47Enabled()).toEqual(false);

    // checking that derived watch-only does not support that:
    const ww = new WatchOnlyWallet();
    ww.setSecret(w.getXpub());
    expect(ww.allowBIP47()).toEqual(false);
  });

  it('should work (samurai)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[0]);
    w.setPassphrase('1');

    expect(w.getBIP47PaymentCode()).toEqual(
      'PM8TJXQ57krakYxKFR3KeUY47kAAE3u6TN7yqDZFw2Mef2EkvYnqbN31BqUN3NaGKvhyaHjtqF1tZpPR4XJbz6ykHL7nZK8oVKzUtofNF1gwAgSpM3u1',
    );

    expect(w._getExternalAddressByIndex(0)).toEqual('dc1q8tu9qtyfps2pcu442alu547qqsu9wx8allav6a');

    const ourNotificationAddress = w.getBIP47NotificationAddress();
    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode(), { network: DOICHAIN, coin: 'DOICHAIN' });
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress()); // same address we derived internally for ourselves and from public Payment Code
    //expect(ourNotificationAddress).toEqual('13VrzVGGdYErtQRggFWvccFtyeELRMbzG1'); // our notif address
    expect(ourNotificationAddress).toEqual('My5EC8mFYvLRQwgBx4qVq8QohsdPJUPedP'); // our notif address



    // since we dont do network calls in unit test we cant get counterparties payment codes from our notif address,
    // and thus, dont know collaborative addresses with our payers. lets hardcode our counterparty payment code to test
    // this functionality

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), []);

    w._receive_payment_codes = [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ];

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ]);

    assert.ok(w.weOwnAddress('dc1q8tu9qtyfps2pcu442alu547qqsu9wx8allav6a'));
    const pubkey = w._getPubkeyByAddress('dc1q8tu9qtyfps2pcu442alu547qqsu9wx8allav6a');
    const path = w._getDerivationPathByAddress('dc1q8tu9qtyfps2pcu442alu547qqsu9wx8allav6a');
    assert.ok(pubkey);
    assert.ok(path);

    const keyPair2 = ECPair.fromWIF(w._getWIFbyAddress('dc1q8tu9qtyfps2pcu442alu547qqsu9wx8allav6a') || '', DOICHAIN);
    const address = bitcoin.payments.p2wpkh({
      pubkey: keyPair2.publicKey,
    }).address;

    assert.strictEqual(address, 'bc1q8tu9qtyfps2pcu442alu547qqsu9wx8agexm6g');
  });

  it('should work (sparrow)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split('')[1]);

    assert.strictEqual(
      w.getXpub(),
      'zpub6ruWgjfkjX6nB9JhuDdb24EAdC7kVPtjAhfy9T7J81W4Kwoa68mnhiYiAEupx2s85JSkERJSNeadA2G5nqu3nHGPuUiWJrMgFtS18XMKDwQ',
    );

    expect(w.getBIP47PaymentCode()).toEqual(
      'PM8TJheeL9gvPFTCaehBXxAQFtXbWQFJVH76Wm8Se3gdJZaEQNA5ehUsXeY72QzjtDmbU4sWJgYQgGCAhsoMZupaWvht5BAeeZce3VvX3L3dYj8nY8f8',
    );

    const ourNotificationAddress = w.getBIP47NotificationAddress();

    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode(), { network: DOICHAIN, coin: 'DOICHAIN' });
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress()); // same address we derived internally for ourselves and from public Payment Code

    expect(ourNotificationAddress).toEqual('N95dfocNoYuhjJZxLy6jvrgsstTHe6kYRk'); // our notif address
  });

  it('should be able to create notification transaction', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    // whom we are going to notify:
    const bip47instanceReceiver = BIP47Factory(ecc).fromBip39Seed(process.env.BIP47_HD_MNEMONIC.split(':')[0], undefined, '1');

    // notifier:
    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split('')[1]);
    walletSender.switchBIP47(true);

    // lets produce a notification transaction and verify that receiver can actually use it

    // since we cant do network calls, we hardcode our senders so later `_getWIFbyAddress`
    // could resolve wif for address deposited by him (funds we want to use reside on addresses from BIP47)
    walletSender._receive_payment_codes = [
      'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF',
    ];

    const utxos: CreateTransactionUtxo[] = [
      {
        value: 74822,
        address: 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk',
        txid: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        vout: 0,
        wif: walletSender._getWIFbyAddress('dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk') + '',
      },
      {
        value: 894626,
        address: 'dc1qj93genwg3y84zjh550zwjvfzmh9ncchww8fmxm',
        txid: '64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f',
        vout: 0,
        wif: walletSender._getWIFbyAddress('dc1qj93genwg3y84zjh550zwjvfzmh9ncchww8fmxm') + '',
      },
    ];

    const changeAddress = 'dc1qj93genwg3y84zjh550zwjvfzmh9ncchww8fmxm';

    const { tx, fee } = walletSender.createBip47NotificationTransaction(
      utxos,
      bip47instanceReceiver.getSerializedPaymentCode(),
      33,
      changeAddress,
    );
    assert(tx);

    const recoveredPaymentCode = bip47instanceReceiver.getPaymentCodeFromRawNotificationTransaction(tx.toHex());
    assert.strictEqual(walletSender.getBIP47PaymentCode(), recoveredPaymentCode); // accepted!

    assert.strictEqual(
      tx.outs[1].script.toString('hex'),
      '6a4c500100031c9282bd392ee9700a50d7161c5f76f7b89e7a6fb551bfd5660e79cc7c8d8e7f7676b25ab4db90a96fadfa1254741e09b35e27c7dc1abcd2dc93c4c32732f45400000000000000000000000000',
    );

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 33);
  });

  it('should be able to pay to PC', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    // whom we are going to pay:
    const bip47instanceReceiver = BIP47Factory(ecc).fromBip39Seed(process.env.BIP47_HD_MNEMONIC.split(':')[0], undefined, '1');

    // notifier:
    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split('')[1]);
    walletSender.switchBIP47(true);

    // since we cant do network calls, we hardcode our senders so later `_getWIFbyAddress`
    // could resolve wif for address deposited by him (funds we want to use reside on addresses from BIP47)
    walletSender._receive_payment_codes = [
      'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF',
    ];

    walletSender.addBIP47Receiver(bip47instanceReceiver.getSerializedPaymentCode());

    const utxos: CreateTransactionUtxo[] = [
      {
        value: 74822,
        address: 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt',
        txid: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt') + '',
      },
      {
        value: 894626,
        address: 'bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl',
        txid: '64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl') + '',
      },
    ];

    const changeAddress = 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq';

    const { tx, fee } = walletSender.createTransaction(
      utxos,
      [
        { address: bip47instanceReceiver.getSerializedPaymentCode(), value: 10234 },
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
      ],
      6,
      changeAddress,
    );
    assert(tx);

    assert.strictEqual(tx.outs[0].value, 10234);
    assert.strictEqual(
      bitcoin.address.fromOutputScript(tx.outs[0].script),
      walletSender._getBIP47AddressSend(bip47instanceReceiver.getSerializedPaymentCode(), 0),
    );

    assert.strictEqual(tx.outs[1].value, 22000);
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS');

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 6);

    // lets retry, but pretend that a few sender's addresses were used:

    walletSender._next_free_payment_code_address_index_send[bip47instanceReceiver.getSerializedPaymentCode()] = 6;

    const { tx: tx2 } = walletSender.createTransaction(
      utxos,
      [
        { address: bip47instanceReceiver.getSerializedPaymentCode(), value: 10234 },
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
      ],
      6,
      changeAddress,
    );
    assert(tx2);

    assert.strictEqual(
      bitcoin.address.fromOutputScript(tx2.outs[0].script),
      walletSender._getBIP47AddressSend(bip47instanceReceiver.getSerializedPaymentCode(), 6),
    );
  });

  it.skip('should be able to pay to PC (BIP-352 SilentPayments)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split('')[1]);
    walletSender.switchBIP47(true);

    const utxos: CreateTransactionUtxo[] = [
      {
        txid: 'ff2b3dc0f16ad96e48f59232421113330781a88ca9b4518846ad9a626260abd3',
        vout: 1,
        address: 'bc1qr7trw22djl93c2vz43ftlmaexhvph8w0v4f6ap',
        value: 195928,
        wif: walletSender._getWIFbyAddress('bc1qr7trw22djl93c2vz43ftlmaexhvph8w0v4f6ap') as string,
      },
    ];
    const changeAddress = 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq';

    const { tx, fee } = walletSender.createTransaction(
      utxos,
      [
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
        {
          address: 'sp1qqvvnsd3xnjpmx8hnn2ua0e9sllm34t9jydf8qfesgc7nhdxgzksjwqlrxx37nfzsg6rure5vwa92fksd6f5a6rk05kr07twhd55u3ahquy2v7t6s',
          value: 10234,
        },
      ],
      6,
      changeAddress,
    );
    assert(tx);

    const legacyAddressDestination = tx.outs.find(o => bitcoin.address.fromOutputScript(o.script) === '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS');
    assert.strictEqual(legacyAddressDestination?.value, 22000);

    const spDestinatiob = tx.outs.find(o => o.value === 10234);
    assert.strictEqual(
      bitcoin.address.fromOutputScript(spDestinatiob!.script!),
      'bc1pu7dwaehvur4lpc7cqmynnjgx5ngthk574p05mgwxf9lecv4r6j5s02nhxq',
    );

    const changeDestination = tx.outs.find(
      o => bitcoin.address.fromOutputScript(o.script) === 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq',
    );

    const calculatedFee = 195928 - changeDestination!.value - spDestinatiob!.value - legacyAddressDestination!.value;

    assert.strictEqual(fee, calculatedFee);

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 6);
  });

  it('can unwrap addresses to send & receive', () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[0]);
    w.setPassphrase('1');

    const addr = w._getBIP47AddressReceive(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
      0,
    );
    assert.strictEqual(addr, 'dc1qvg6ajy4w2vauye8t5lh8uksw9u3pkslj9fjyqk');

    const addr2 = w._getBIP47AddressSend(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
      0,
    );

    assert.strictEqual(addr2, 'dc1qrt38q6vvnfqp8v5j3uhsz59q9mz9rth2whzekk');

    assert.strictEqual(w.getAllExternalAddresses().length, 20); // exactly gap limit for external addresses
    assert.ok(!w.getAllExternalAddresses().includes(addr)); // joint address to _receive_ is not included

    // since we dont do network calls in unit test we cant get counterparties payment codes from our notif address,
    // and thus, dont know collaborative addresses with our payers. lets hardcode our counterparty payment code to test
    // this functionality

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), []);

    w.switchBIP47(true);

    w._receive_payment_codes = [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ];

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ]);

    assert.ok(w.getAllExternalAddresses().includes(addr)); // joint address to _receive_ is included
    assert.ok(w.getAllExternalAddresses().length > 20);
  });
});
