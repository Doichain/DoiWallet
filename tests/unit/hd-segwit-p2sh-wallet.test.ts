import assert from 'assert';

import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet, LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from '../../class';

describe('P2SH Segwit HD (BIP49)', () => {
  it('can create a wallet', async () => {
    const mnemonic =
      'coil earn raccoon party result public shrug corn scrap field security devote'
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.strictEqual('6Fs7zrS4PxbWBHyvQ5LVDJ7k6Aw4WMRVo3', hd._getExternalAddressByIndex(0));
    assert.strictEqual('6b6xaYYa642DvGRkGF5q1tnLWc7tN9mEw4', hd._getExternalAddressByIndex(1));
    assert.strictEqual('6RhhCTgPK5ZoDqxFS8Gx4XGnRg2pGpDiiu', hd._getInternalAddressByIndex(0));
    assert.ok(hd.getAllExternalAddresses().includes('6Fs7zrS4PxbWBHyvQ5LVDJ7k6Aw4WMRVo3'));
    assert.ok(hd.getAllExternalAddresses().includes('6b6xaYYa642DvGRkGF5q1tnLWc7tN9mEw4'));
    assert.ok(!hd.getAllExternalAddresses().includes('6RhhCTgPK5ZoDqxFS8Gx4XGnRg2pGpDiiu')); // not internal
    assert.strictEqual(true, hd.validateMnemonic());

    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0)).toString('hex'),
      '0316bc5ac110d06ca8a526d7a8add047a225e731228e8052e156d89964c54cc608',
    );
    assert.strictEqual(
      hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0)).toString('hex'),
      '02926764025179f895a2acac6a96d451b4ac096790902464d67fa576f5575e1330',
    );

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/49'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/49'/0'/0'/1/0");

    assert.strictEqual('Tiet1ST12YSUPTPpQt7ZjHKoXJWbB5uDFJJmpZZMDxTQNHEoDUrZ', hd._getExternalWIFByIndex(0));
    assert.strictEqual(
      'ypub6XDHpstPBUrU5yhBNLykJbSiVGyJG993JFCsF6ftjnzEKtLHeEsnKGSfBhUBTy5YnRsB9L9fgLraiY5GFzUXabUdT55M2i84CeX2co1GnVk',
      hd.getXpub(),
    );
  });

  it('can convert witness to address', () => {
    let address = SegwitP2SHWallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    assert.strictEqual(address, '6HGK9TRz8afMsvDN2BreWNg8LvNKdE26pa');
    address = SegwitP2SHWallet.witnessToAddress('');
    assert.strictEqual(address, false);
    address = SegwitP2SHWallet.witnessToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitP2SHWallet.scriptPubKeyToAddress('a914e286d58e53f9247a4710e51232cce0686f16873c87');
    assert.strictEqual(address, '6b3c3DBMpdxEnXztd3sUs4GGUUjXkS9MuE');
    address = SegwitP2SHWallet.scriptPubKeyToAddress('');
    assert.strictEqual(address, false);
    address = SegwitP2SHWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitBech32Wallet.witnessToAddress('035c618df829af694cb99e664ce1b34f80ad2c3b49bcd0d9c0b1836c66b2d25fd8');
    assert.strictEqual(address, 'dc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8ez3jue');
    address = SegwitBech32Wallet.witnessToAddress('');
    assert.strictEqual(address, false);
    address = SegwitBech32Wallet.witnessToAddress('trololo');
    assert.strictEqual(address, false);

    address = SegwitBech32Wallet.scriptPubKeyToAddress('00144d757460da5fcaf84cc22f3847faaa1078e84f6a');
    assert.strictEqual(address, 'dc1qf46hgcx6tl90snxz9uuy0742zpuwsnm2fzt6ht');
    address = SegwitBech32Wallet.scriptPubKeyToAddress('');
    assert.strictEqual(address, false);
    address = SegwitBech32Wallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);

    address = LegacyWallet.scriptPubKeyToAddress('76a914d0b77eb1502c81c4093da9aa6eccfdf560cdd6b288ac');
    assert.strictEqual(address, 'NFbxZzmQKnS1YhjyvZNtMrGnWGqVM91umT');
    address = LegacyWallet.scriptPubKeyToAddress('');
    assert.strictEqual(address, false);
    address = LegacyWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);
  });

  it('Segwit HD (BIP49) can generate addressess only via ypub', function () {
    const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
    const hd = new HDSegwitP2SHWallet();
    console.log("____", hd._getInternalAddressByIndex(0))
    hd._xpub = ypub;
    assert.strictEqual('6VK9EzDRN1cZg7QfsXMqjvZs82d92oPakR', hd._getExternalAddressByIndex(0));
    assert.strictEqual('6JWuDoaTuZUHa5zZKATXH1gCU3oEDA63fh', hd._getExternalAddressByIndex(1));
    assert.strictEqual('6TcU3xkecDMHpjS1tDoBUpbtzv2PYRYVEJ', hd._getInternalAddressByIndex(0));
    assert.ok(hd.getAllExternalAddresses().includes('6VK9EzDRN1cZg7QfsXMqjvZs82d92oPakR'));
    assert.ok(hd.getAllExternalAddresses().includes('6JWuDoaTuZUHa5zZKATXH1gCU3oEDA63fh'));
    assert.ok(!hd.getAllExternalAddresses().includes('32yn5CdevZQLk3ckuZuA8fEKBco8mEkLei')); // not internal
  });

  it('can generate Segwit HD (BIP49)', async () => {
    const hd = new HDSegwitP2SHWallet();
    const hashmap: Record<string, number> = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = 1;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    const hd2 = new HDSegwitP2SHWallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can work with malformed mnemonic', () => {
    let mnemonic =
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode';
    let hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed1 = hd._getSeed().toString('hex');
    assert.ok(hd.validateMnemonic());

    mnemonic = 'hell';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.ok(!hd.validateMnemonic());

    // now, malformed mnemonic

    mnemonic =
      '    honey  risk   juice    trip     orient      galaxy win !situate ;; shoot   ;;;   anchor Bounce remind\nhorse \n traffic exotic since escape mimic ramp skin judge owner topple erode ';
    hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    const seed2 = hd._getSeed().toString('hex');
    assert.strictEqual(seed1, seed2);
    assert.ok(hd.validateMnemonic());
  });

  it('can generate addressess based on xpub', async function () {
    const xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
    const hd = new HDLegacyP2PKHWallet();
    hd._xpub = xpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'MxDmMQZrbZ31xx3soZjjPqr7FSGnoDTGFY');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'NF973Bnk2x6nGEz7uS4EdShZyG69MCFnp1');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'NKnZTGKmmwAYNhfU3RF1uAd6swxc6AvsT2');
    assert.strictEqual(hd._getInternalAddressByIndex(1), 'MxmsMA1Antun1TbPs5A8DEf6EgwXn4zNfK');
    assert.ok(hd.getAllExternalAddresses().includes('MxDmMQZrbZ31xx3soZjjPqr7FSGnoDTGFY'));
    assert.ok(hd.getAllExternalAddresses().includes('NKnZTGKmmwAYNhfU3RF1uAd6swxc6AvsT2'));
    assert.ok(!hd.getAllExternalAddresses().includes('1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX')); // not internal
  });

  it('can consume user generated entropy', async () => {
    const hd1 = new HDSegwitP2SHWallet();
    const zeroes16 = [...Array(16)].map(() => 0);
    await hd1.generateFromEntropy(Buffer.from(zeroes16));
    assert.strictEqual(hd1.getSecret(), 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');

    const hd2 = new HDSegwitP2SHWallet();
    const zeroes32 = [...Array(32)].map(() => 0);
    await hd2.generateFromEntropy(Buffer.from(zeroes32));
    assert.strictEqual(
      hd2.getSecret(),
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    );
  });

  it('throws an error if not 32 bytes provided', async () => {
    const hd = new HDSegwitP2SHWallet();
    const values = [...Array(31)].map(() => 1);
    await assert.rejects(async () => await hd.generateFromEntropy(Buffer.from(values)), {
      message: 'Entropy has to be 16 or 32 bytes long',
    });
  });

  it('can sign and verify messages', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    let signature;

    // external address
    signature = hd.signMessage('vires is numeris', hd._getExternalAddressByIndex(0));
    assert.strictEqual(signature, 'JMgoRSlLLLw6mw/Gbbg8Uj3fACkIJ85CZ52T5ZQfBnpUBkz0myRju6Rmgvmq7ugytc4WyYbzdGEc3wufNbjP09g=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getExternalAddressByIndex(0), signature), true);

    // internal address
    signature = hd.signMessage('vires is numeris', hd._getInternalAddressByIndex(0));
    assert.strictEqual(signature, 'I5WkniWTnJhTW74t3kTAkHq3HdiupTNgOZLpMp0hvUfAJw2HMuyRiNLl2pbNWobNCCrmvffSWM7IgkOBz/J9fYA=');
    assert.strictEqual(hd.verifyMessage('vires is numeris', hd._getInternalAddressByIndex(0), signature), true);
  });

  it('can show fingerprint', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const passphrase = 'super secret passphrase';
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    assert.strictEqual(
      hd.getXpub(),
      'ypub6Xa3WiyXHriYt1fxZGWS8B1iduw92yxHCMWKSwJkW6w92FUCTJxwWQQHLXjRHBSsMLY6SvRu8ErqFEC3JmrkTHEm7KSUfbzhUhj7Yopo2JR',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), '6QbcFXB9ViAYVQrHGvfsa1B6MX81NPPxqm');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '6T1SmT449ddcykfQ794yT2tqWKoPzXmRxz');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'TkGwahJhaMVQYHVkuBWLf5SxBNREnDhXeycHrJARo7o2Gqdrie1w');
  });

  it('can create with custom derivation path', async () => {
    const hd = new HDSegwitP2SHWallet();
    hd.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    hd.setDerivationPath("m/49'/0'/1'");

    assert.strictEqual(
      hd.getXpub(),
      'ypub6Ww3ibxVfGzLtJR4F9SRBicspAfvmvw54yern9Q6qZWFC9T6FYA34K57La5Sgs8pXuyvpDfEHX5KNZRiZRukUWaVPyL4NxA69sEAqdoV8ve',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), '6JMhsNRFSzmiKapMTRzpiy7NzETHEW2tKH');
    assert.strictEqual(hd._getInternalAddressByIndex(0), '6JPPSfVG4jwQE66hp5gKLQTiPkSvvMuRVj');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'TeckKBZez7j9houBDbG9ciMzXnUjzHQWas3L7BgRcK1PJjy2wnBr');

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/49'/0'/1'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/49'/0'/1'/1/0");
  });
});
