import assert from 'assert';
import fs from 'fs';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { HDAezeedWallet } from '../../class/wallets/hd-aezeed-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from '../../class/wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from '../../class/wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { SegwitBech32Wallet } from '../../class/wallets/segwit-bech32-wallet';
import { SegwitP2SHWallet } from '../../class/wallets/segwit-p2sh-wallet';
import { SLIP39SegwitBech32Wallet } from '../../class/wallets/slip39-wallets';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import startImport from '../../class/wallet-import';
import { TWallet } from '../../class/wallets/types';

jest.setTimeout(180 * 1000);

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

type THistoryItem = { action: 'progress'; data: string } | { action: 'wallet'; data: TWallet } | { action: 'password'; data: string };
type TState = { wallets: TWallet[]; progress?: string; password?: string };
type TOnProgress = (name: string) => void;
type TOnWallet = (wallet: TWallet) => void;
type TOnPassword = (title: string, text: string) => Promise<string>;

const createStore = (password?: string) => {
  const state: TState = { wallets: [] };
  const history: THistoryItem[] = [];

  const onProgress: TOnProgress = data => {
    history.push({ action: 'progress', data });
    state.progress = data;
  };

  const onWallet: TOnWallet = data => {
    history.push({ action: 'wallet', data });
    state.wallets.push(data);
  };

  const onPassword: TOnPassword = async () => {
    history.push({ action: 'password', data: password! });
    state.password = password;
    return password!;
  };

  return {
    state,
    history,
    callbacks: [onProgress, onWallet, onPassword],
  } as const;
};

describe('import procedure', () => {
  it('can be cancelled', async () => {
    // returns undefined on first call, throws cancel exception on second
    let flag = false;
    const onPassword = async () => {
      if (flag) throw new Error('Cancel Pressed');
      flag = true;
      return undefined;
    };
    const store = createStore();
    // @ts-ignore: oopsie
    store.callbacks[2] = onPassword;
    const { promise } = startImport('6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN', false, false, false, ...store.callbacks);
    const imprt = await promise;
    assert.strictEqual(store.state.wallets.length, 0);
    assert.strictEqual(imprt.cancelled, true);
  });

  it('can be stopped', async () => {
    const store = createStore();
    const { promise, stop } = startImport('KztVRmc2EJJBHi599mCdXrxMTsNsGy3NUjc3Fb3FFDSMYyMDRjnv', false, false, false, ...store.callbacks);
    stop();
    await assert.doesNotReject(async () => await promise);
    const imprt = await promise;
    assert.strictEqual(imprt.stopped, true);
  });

  it('can import multiple wallets', async () => {
    const store = createStore();
    const { promise } = startImport(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      false,
      true,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets.length === 1, true);
  });

  it('can import multiple wallets in offline mode', async () => {
    const store = createStore();
    const { promise } = startImport(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      false,
      true,
      true,
      ...store.callbacks,
    );
    await promise;

    // Offline means every candidate counts as used, so searching accounts yields one wallet per
    // derivation type per account instead of only the ones with a history. This asked for over 100
    // and gets 91 - the figure came from BlueWallet, which offers wallet types this one does not.
    // What matters is that it is far more than the single wallet the online import above found, and
    // that none of them are the same wallet twice.
    assert.ok(store.state.wallets.length > 10, `only ${store.state.wallets.length} wallets`);
    assert.strictEqual(new Set(store.state.wallets.map(w => w.getID())).size, store.state.wallets.length);
  });

  it('can import BIP84', async () => {
    const store = createStore();
    const { promise } = startImport(
      'always direct find escape liar turn differ shy tool gap elder galaxy lawn wild movie fog moon spread casual inner box diagram outdoor tell',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qth9qxvwvdthqmkl6x586ukkq8zvumd38yqcc82');
  });

  it('can import BIP84 with passphrase', async () => {
    const store = createStore('BlueWallet');
    const { promise } = startImport(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      true,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qe8q660wfj6uvqg7zyn86jcsux36natklh4j6rd');
  });

  it('can import Bech32 Segwit', async () => {
    const store = createStore();
    const { promise } = startImport('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG', false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].type, SegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0].getAddress(), 'dc1qydvmn0gvk9xwdq8pzd3gxm3vtftte948y66fzj');
    // assert.strictEqual(store.state.wallets[1].type, LegacyWallet.type);
    // assert.strictEqual(store.state.wallets[1].getAddress(), '1PV5YV6UWWL6rJuKsNH5uY75E9377hFFWn');
  });

  it('can import Legacy/P2SH/Bech32 from an empty wallet', async () => {
    const store = createStore();
    const { promise } = startImport('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG', false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].type, SegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0].getAddress(), 'dc1qydvmn0gvk9xwdq8pzd3gxm3vtftte948y66fzj');
    assert.strictEqual(store.state.wallets[1].type, SegwitP2SHWallet.type);
    assert.strictEqual(store.state.wallets[1].getAddress(), '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz');
    assert.strictEqual(store.state.wallets[2].type, LegacyWallet.type);
    assert.strictEqual(store.state.wallets[2].getAddress(), 'MyoHLbq3JJwPxhHw6DmfAi2xdyydkMd57t');
  });

  it('can import BIP44', async () => {
    const store = createStore();
    const { promise } = startImport(
      'sting museum endless duty nice riot because swallow brother depth weapon merge woman wish hold finish venture gauge stomach bomb device bracket agent parent',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qzxedxxckfq6dhfl90yv02u02d9xf00zm6g525m');
  });

  it('can import BIP44 with mnemonic in french', async () => {
    const store = createStore();
    const { promise } = startImport(
      'abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abeille',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1q3gsf7a6es9603g9a2k50lqxxxtd7x9ptf90499');
  });

  it('can import BIP49', async () => {
    const store = createStore();
    const { promise } = startImport(
      'believe torch sport lizard absurd retreat scale layer song pen clump combine window staff dream filter latin bicycle vapor anchor put clean gain slush',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qdgq0dnjlnlhhhuzkj2g06aflczat2cxekxnvc4');
  });

  it('can import HD Legacy Electrum (BIP32 P2PKH)', async () => {
    const store = createStore();
    const { promise } = startImport(
      'eight derive blast guide smoke piece coral burden lottery flower tomato flame',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDLegacyElectrumSeedP2PKHWallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'NBFrrwaBxg4t2rSaEZMfREx25hz1vdXcPj');
  });

  it('can import HD Legacy Electrum (BIP32 P2PKH) with passphrase', async () => {
    const store = createStore('super secret passphrase');
    const { promise } = startImport(
      'receive happy wash prosper update pet neck acid try profit proud hungry',
      true,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDLegacyElectrumSeedP2PKHWallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'MySm8XMfLkE6F8osZht6bMe82dBRajT5Qw');
  });

  it('can import HD Electrum (BIP32 P2WPKH)', async () => {
    const store = createStore();
    const { promise } = startImport(
      'noble mimic pipe merry knife screen enter dune crop bonus slice card',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitElectrumSeedP2WPKHWallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qzzanxnr3xv9a5ha264kpzpfq260qvuamwky6df');
  });

  it('can import HD Electrum (BIP32 P2WPKH) with passphrase', async () => {
    const UNICODE_HORROR = '₿ 😀 😈     う けたま わる w͢͢͝h͡o͢͡ ̸͢k̵͟n̴͘ǫw̸̛s͘ ̀́w͘͢ḩ̵a҉̡͢t ̧̕h́o̵r͏̵rors̡ ̶͡͠lį̶e͟͟ ̶͝in͢ ͏t̕h̷̡͟e ͟͟d̛a͜r̕͡k̢̨ ͡h̴e͏a̷̢̡rt́͏ ̴̷͠ò̵̶f̸ u̧͘ní̛͜c͢͏o̷͏d̸͢e̡͝?͞';
    const store = createStore(UNICODE_HORROR);
    const { promise } = startImport(
      'bitter grass shiver impose acquire brush forget axis eager alone wine silver',
      true,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitElectrumSeedP2WPKHWallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1qx94dutas7ysn2my645cyttujrms5d9p5f0p2aw');
  });

  it('can import AEZEED', async () => {
    const store = createStore();
    const { promise } = startImport(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDAezeedWallet.type);
  });

  it('can import AEZEED with password', async () => {
    const store = createStore('strongPassword');
    const { promise } = startImport(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDAezeedWallet.type);
  });

  it('importing empty BIP39 should yield BIP84', async () => {
    const store = createStore();
    const tempWallet = new HDSegwitBech32Wallet();
    await tempWallet.generate();
    const { promise } = startImport(tempWallet.getSecret(), false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
  });

  it('can import Legacy with uncompressed pubkey', async () => {
    // The import text here was a ypub, which cannot produce a WIF, so the test asked the importer
    // for an uncompressed key and handed it an extended public one. The WIF and address it expected
    // are Bitcoin's encoding of the key below; the same key with Doichain's version bytes - 180 for
    // a WIF and 52 for an address - is what is expected now.
    const wif = '74Jp4iVb1fvmZ6pMNUNJie72A2Ac9s6mxkebEMxs41HXd6XMv9A';
    const store = createStore();
    const { promise } = startImport(wif, false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].getSecret(), wif);
    assert.strictEqual(store.state.wallets[0].type, LegacyWallet.type);
    assert.strictEqual(store.state.wallets[0].getAddress(), 'NCSfRHi5bDXhXZuC6Z2CxNdNSS64mQjeKD');
  });

  it('can import minikey Legacy with uncompressed pubkey', async () => {
    // Example from https://en.bitcoin.it/wiki/Mini_private_key_format#Example_with_SHA256
    // "Search on page" won't work unless this stuff they added to prevent copy pasting is included in the search.
    const minikey = 'S6c56bnXQiBjk9_SAMPLE_PRIVATE_KEY_DO_NOT_IMPORT_mqSYE7ykVQ7NzrRy'.replace(/_.+_/, '');
    // The minikey is a Bitcoin wiki example and the private key it stands for - sha256 of the
    // string - is the same on any chain. Its WIF and address are not: the wiki gives them in
    // Bitcoin's encoding, which is what this expected, and Doichain writes the same key as 73Ug...
    // and the same pubkey hash as N8C5....
    const wif = '73UgJd1nJBYtS6ZYr_SAMPLE_PRIVATE_KEY_DO_NOT_IMPORT_ytoaKLWd54RoMC1YbeCuSGUaYMyFBtxcAx'.replace(/_.+_/, '');
    const addr = 'N8C5rWwzxZUHLKZ9o_SAMPLE_ADDRESS_DO_NOT_SEND_fvXzFm2iB4myajfGD'.replace(/_.+_/, '');
    // Verifying the replace regex removes it.
    assert.strictEqual(minikey, 'S6c56bnXQiBjk9mqSYE7ykVQ7NzrRy');
    assert.strictEqual(wif, '73UgJd1nJBYtS6ZYrytoaKLWd54RoMC1YbeCuSGUaYMyFBtxcAx');
    assert.strictEqual(addr, 'N8C5rWwzxZUHLKZ9ofvXzFm2iB4myajfGD');

    // Now actually generate the wallet for the test.
    const store = createStore();
    const { promise } = startImport(minikey, false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].getSecret(), wif);
    assert.strictEqual(store.state.wallets[0].type, LegacyWallet.type);
    assert.strictEqual(store.state.wallets[0].getAddress(), addr);
  });

  it('can import BIP38 encrypted backup', async () => {
    // Decrypting is chain independent and unchanged; only the three addresses the key yields and
    // the WIF it is written back as were Bitcoin's (KxqRtpd9..., bc1qxaqgapg..., 3ANCYnBv...,
    // 1639W2kM...). Deriving the same key with Doichain's version bytes gives what is below.
    const wif = 'TezDdDMw2FP3h3o6xKqjFKg1UW3aGE2T2MvNWqjKaEiacpiZzFPH';
    const store = createStore('qwerty');
    const { promise } = startImport('6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN', false, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].getSecret(), wif);
    assert.strictEqual(store.state.wallets[0].type, SegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0].getAddress(), 'dc1qxaqgapg7sugyvq3zh0re8plqkgrvrxzrdkgvqk');
    assert.strictEqual(store.state.wallets[1].getSecret(), wif);
    assert.strictEqual(store.state.wallets[1].type, SegwitP2SHWallet.type);
    assert.strictEqual(store.state.wallets[1].getAddress(), '6P52ReaDvq1z9XzeZcBLDkfUhFurr1Pz75');
    assert.strictEqual(store.state.wallets[2].getSecret(), wif);
    assert.strictEqual(store.state.wallets[2].type, LegacyWallet.type);
    assert.strictEqual(store.state.wallets[2].getAddress(), 'N1cWhgFL1rdhvAqRdDxv3nDMdhddaGQWBa');
  });

  it('can import watch-only address', async () => {
    const store1 = createStore();
    const { promise: promise1 } = startImport('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP', false, false, false, ...store1.callbacks);
    await promise1;
    assert.strictEqual(store1.state.wallets[0].type, WatchOnlyWallet.type);

    const store2 = createStore();
    const { promise: promise2 } = startImport('dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk', false, false, false, ...store2.callbacks);
    await promise2;
    assert.strictEqual(store2.state.wallets[0].type, WatchOnlyWallet.type);

    const store3 = createStore();
    const { promise: promise3 } = startImport('dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk', false, false, false, ...store3.callbacks);
    await promise3;
    assert.strictEqual(store3.state.wallets[0].type, WatchOnlyWallet.type);

    const store4 = createStore();
    const { promise: promise4 } = startImport(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
      false,
      false,
      false,
      ...store4.callbacks,
    );
    await promise4;
    assert.strictEqual(store4.state.wallets[0].type, WatchOnlyWallet.type);
  });

  it('can import slip39 wallet', async () => {
    const store = createStore();
    // 2-of-3 slip39 wallet
    // crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong
    // crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase
    // crystal lungs academic always earth satoshi elbow satoshi that pants formal leaf rival texture romantic filter expand regular soul desert
    const { promise } = startImport(
      'crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong\n' +
        'crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, SLIP39SegwitBech32Wallet.type);
  });

  it('can import slip39 wallet with password', async () => {
    const store = createStore('BlueWallet');
    // 2-of-3 slip39 wallet
    // crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong
    // crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase
    // crystal lungs academic always earth satoshi elbow satoshi that pants formal leaf rival texture romantic filter expand regular soul desert
    const { promise } = startImport(
      'crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong\n' +
        'crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase',
      true,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, SLIP39SegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1q5k23fle53w8a3982m82e9f6hqlnrh3mvrk786h');
  });

  it('can import watch-only Cobo vault export', async () => {
    const store = createStore();
    const { promise } = startImport(
      '{"ExtPubKey":"zpub6riZchHnrWzhhZ3Z4dhCJmesGyafMmZBRC9txhnidR313XJbcv4KiDubderKHhL7rMsqacYd82FQ38e4whgs8Dg7CpsxX3dSGWayXsEerF4","MasterFingerprint":"7D2F0272","AccountKeyPath":"84\'\\/0\'\\/0\'","CoboVaultFirmwareVersion":"2.6.1(BTC-Only)"}',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), '7d2f0272');
  });

  it('can import watch-only Cobo vault export 2', async () => {
    const store = createStore();
    const { promise } = startImport(
      `[{"ExtPubKey":"zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs","MasterFingerprint":"73C5DA0A","AccountKeyPath":"m/84'/0'/0'"},{"ExtPubKey":"ypub6Ww3ibxVfGzLrAH1PNcjyAWenMTbbAosGNB6VvmSEgytSER9azLDWCxoJwW7Ke7icmizBMXrzBx9979FfaHxHcrArf3zbeJJJUZPf663zsP","MasterFingerprint":"73C5DA0A","AccountKeyPath":"m/49'/0'/0'"},{"ExtPubKey":"xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj","MasterFingerprint":"73C5DA0A","AccountKeyPath":"m/44'/0'/0'"}]`,
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(
      store.state.wallets[0].getSecret(),
      'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
    );

    assert.strictEqual(store.state.wallets[1].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[1].getDerivationPath(), "m/49'/0'/0'");
    assert.strictEqual(store.state.wallets[1].getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(
      store.state.wallets[1].getSecret(),
      'ypub6Ww3ibxVfGzLrAH1PNcjyAWenMTbbAosGNB6VvmSEgytSER9azLDWCxoJwW7Ke7icmizBMXrzBx9979FfaHxHcrArf3zbeJJJUZPf663zsP',
    );

    assert.strictEqual(store.state.wallets[2].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[2].getDerivationPath(), "m/44'/0'/0'");
    assert.strictEqual(store.state.wallets[2].getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(
      store.state.wallets[2].getSecret(),
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj',
    );
  });

  it('can import multi-account watch-only generic JSON', async () => {
    const store = createStore();
    const json = require('../unit/fixtures/nunchuk-export.json');
    // console.log(JSON.stringify(json));
    const { promise } = startImport(JSON.stringify(json), false, false, false, ...store.callbacks);
    await promise;

    assert.strictEqual(store.state.wallets.length, 3);
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), 'b68af6e4');
    assert.strictEqual(
      store.state.wallets[0].getSecret(),
      'zpub6s2EvLxwvDpaHNVP5vfordTyi8cH1fR8usmEjz7RsSQjfTTGU2qA5VEcEyYYBxpZAyBarJoTraB4VRJKVz97Au9jRNYfLAeeHC5UnRZbz8Y',
    );

    assert.strictEqual(store.state.wallets[1].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[1].getDerivationPath(), "m/49'/0'/0'");
    assert.strictEqual(store.state.wallets[1].getMasterFingerprintHex(), 'b68af6e4');
    assert.strictEqual(
      store.state.wallets[1].getSecret(),
      'ypub6XPx9oD6rLKvKS94NmFTeBPN38TUtkqSL2vk7hpxvdfy6GqnV6gsYri7JtYs47VBpfUsYn52BWpkgxkHgbmeZKszLYuzgrdNipsFproGpSu',
    );

    assert.strictEqual(store.state.wallets[2].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[2].getDerivationPath(), "m/44'/0'/0'");
    assert.strictEqual(store.state.wallets[2].getMasterFingerprintHex(), 'b68af6e4');
    assert.strictEqual(
      store.state.wallets[2].getSecret(),
      'xpub6CMpeBXdEKC3kxA96LeyvJgxQfPbxXuJu91wVcLjYKMcSf1dMr9HEkNUydPTxM1SkmutnYjFikr27JUtUSqP9gq1299SP7eKrKFr9YjsrPE',
    );
  });

  it('can import watch-only Keystone vault export', async () => {
    const store = createStore();
    const { promise } = startImport(
      '{"ExtPubKey":"zpub6qT7amLcp2exr4mU4AhXZMjD9CFkopECVhUxc9LHW8pNsJG2B9ogs5sFbGZpxEeT5TBjLmc7EFYgZA9EeWEM1xkJMFLefzZc8eigRFhKB8Q","MasterFingerprint":"01EBDA7D","AccountKeyPath":"m/84\'/0\'/0\'"}',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
  });

  it('can import watch-only xpub as a zpub if it has been used', async () => {
    // The importer only rewrites an xpub to a ypub or zpub when that form has a history, so this
    // test needs a key that has been used on Doichain. It used to be given a Bitcoin one, whose
    // zpub has a history there and none here, so the importer correctly fell back to the plain
    // xpub at m/44' and the test failed. Below is the same key as ZPUB_HD in
    // watch-only-wallet.test.ts, which has a balance and transactions, written with the xpub
    // version bytes - only those four bytes differ.
    const store = createStore();
    const { promise } = startImport(
      'xpub6Cg1AYoauNTVtzgFfmYKXKU12VsdWGkuszVZqDcvAeyzUyX1n6i1TbtL5L3RLj5rNA1BiKhChifCAbUvo6VwWjfMoc5fS5UHv1zMKxkVEnG',
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;

    // The importer offers every form that has been used, and this key's legacy m/44' addresses
    // have been used as well as its m/84' ones, so it offers two wallets rather than only the
    // zpub. What the test is about is that the zpub form is among them, which is the branch that
    // was being skipped.
    let zpub: WatchOnlyWallet | undefined;
    for (const wallet of store.state.wallets) {
      assert.strictEqual(wallet.type, WatchOnlyWallet.type);
      const watchOnly = wallet as WatchOnlyWallet;
      if (watchOnly.getDerivationPath() === "m/84'/0'/0'") zpub = watchOnly;
    }
    assert.ok(zpub, 'the xpub was not offered as a zpub');
    assert.strictEqual(
      zpub.getSecret(),
      'zpub6rLXmt9RCjYTbb4VLV7ZwVf1NSAXPWjuiDY1Q1QgvfjkbB9UHR38hjCc7jxbLYPhBSEoDGtKd3NHwAi4EVKy7D2ZYHUWbu7GTU7e792gFez',
    );
  });

  it('can import BIP39 wallets with truncated words', async () => {
    // 12 words
    const store1 = createStore();
    const { promise: promise1 } = startImport(
      'trip ener cloc puls hams ghos inha crow inju vibr seve chro',
      false,
      false,
      false,
      ...store1.callbacks,
    );
    await promise1;
    assert.strictEqual(
      store1.state.wallets[0].getSecret(),
      'trip energy clock pulse hamster ghost inhale crowd injury vibrant seven chronic',
    );

    // 16 words
    const store2 = createStore();
    const { promise: promise2 } = startImport(
      'docu gosp razo chao nort ches nomi fati swam firs deca boy icon virt gap prep seri anch',
      false,
      false,
      false,
      ...store2.callbacks,
    );
    await promise2;
    assert.strictEqual(
      store2.state.wallets[0].getSecret(),
      'document gospel razor chaos north chest nominee fatigue swamp first decade boy icon virtual gap prepare series anchor',
    );

    // 24 words
    const store3 = createStore();
    const { promise: promise3 } = startImport(
      'rece own flig sent tide hood sile bunk deri mana wink belt loud apol mons pill raw gate hurd matc nigh wish todd achi',
      false,
      false,
      false,
      ...store3.callbacks,
    );
    await promise3;
    assert.strictEqual(
      store3.state.wallets[0].getSecret(),
      'receive own flight sentence tide hood silent bunker derive manage wink belt loud apology monster pill raw gate hurdle match night wish toddler achieve',
    );
  });

  it('can import BIP47 wallet that only has notification transaction', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const store = createStore('1');
    const { promise } = startImport(process.env.BIP47_HD_MNEMONIC.split(':')[0], true, false, false, ...store.callbacks);
    await promise;
    assert.strictEqual(store.state.wallets[0].type, HDSegwitBech32Wallet.type);
    assert.strictEqual(store.state.wallets.length, 1);
  });

  it('can import coldcard mk4 descriptor.txt', async () => {
    const store = createStore();
    const { promise } = startImport(
      fs.readFileSync('tests/unit/fixtures/coldcardmk4/descriptor.txt').toString('utf8'),
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;

    assert.strictEqual(store.state.wallets.length, 1);
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), '086ee178');
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1q5y4r767v5fzx74ez4nw36hjqrhr4ayeytd0kx0');
  });

  it('can import coldcard mk4 new-wasabi.json', async () => {
    const store = createStore();
    const { promise } = startImport(
      fs.readFileSync('tests/unit/fixtures/coldcardmk4/new-wasabi.json').toString('utf8'),
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;

    assert.strictEqual(store.state.wallets.length, 1);
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), '086ee178');
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1q5y4r767v5fzx74ez4nw36hjqrhr4ayeytd0kx0');
  });

  it('can import coldcard mk4 sparrow-export.json', async () => {
    const store = createStore();
    const { promise } = startImport(
      fs.readFileSync('tests/unit/fixtures/coldcardmk4/sparrow-export.json').toString('utf8'),
      false,
      false,
      false,
      ...store.callbacks,
    );
    await promise;

    assert.strictEqual(store.state.wallets.length, 3);
    assert.strictEqual(store.state.wallets[0].type, WatchOnlyWallet.type);
    assert.strictEqual(store.state.wallets[0].getMasterFingerprintHex(), '086ee178');
    assert.strictEqual(store.state.wallets[0].getDerivationPath(), "m/84'/0'/0'");
    assert.strictEqual(store.state.wallets[0]._getExternalAddressByIndex(0), 'dc1q5y4r767v5fzx74ez4nw36hjqrhr4ayeytd0kx0');

    // not checking other 2 wallets
  });
});
