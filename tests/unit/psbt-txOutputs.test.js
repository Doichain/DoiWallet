import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import { DOICHAIN, VERSION } from '../../blue_modules/network.js';
import { HDSegwitBech32Wallet, MultisigHDWallet } from "../../class";
import { getNameOPStackScript } from "./getNameOPStackScript.js"

describe("AbstractHDElectrumWallet", () => {

  it("txOutputs", async () => {
    let hd = new HDSegwitBech32Wallet();
    hd.setSecret(
      "runway bike beyond depth ride broken twist ribbon harbor turkey bridge team"
    );
    assert.ok(hd.validateMnemonic());

    assert.strictEqual(
      "zpub6rLXmt9RCjYTbb4VLV7ZwVf1NSAXPWjuiDY1Q1QgvfjkbB9UHR38hjCc7jxbLYPhBSEoDGtKd3NHwAi4EVKy7D2ZYHUWbu7GTU7e792gFez",
      hd.getXpub()
    );

    assert.strictEqual(
      hd._getExternalAddressByIndex(0),
      "dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk"
    );
    assert.strictEqual(
      hd._getExternalAddressByIndex(1),
      "dc1qlghhgmr4hrjgqfvncy3hmxkcgrphh3kukuref4"
    );
    assert.strictEqual(
      hd._getInternalAddressByIndex(0),
      "dc1qj93genwg3y84zjh550zwjvfzmh9ncchww8fmxm"
    );

    let tx;
    let psbt;
    let updatedTxOutputs;

    const unsignedPsbt =
      "cHNidP8BAKgAcQAAAUYgP05kkUAUETEcSouYBrkdr6v6Man5Sv4m0IbV2M2bAQAAAAD/////AkBCDwAAAAAATVoqZGMxcWdscTlyNDh6cWFscmFkZmpsdmRxOWFjeTh3Zm41MjI3bmxmamRrBWVtcHR5bXV2qRRHwFHU4gd+PrUy+xoC9wQ7kzopXoismbe1BQAAAAAWABRHwFHU4gd+PrUy+xoC9wQ7kzopXgAAAAAAAQDzAHEAAAABAQ/ZVPJIaWXjSEgv7rNJYtlzvDlmQkxmEQ5IQMNe3NlLAQAAAAD/////AkBCDwAAAAAAKloHY3J5cHRvNgVlbXB0eW11dqkUR8BR1OIHfj61MvsaAvcEO5M6KV6IrHnCxQUAAAAAFgAUR8BR1OIHfj61MvsaAvcEO5M6KV4CSDBFAiEAzYW6qhEx0k6l+p42Gaq5+l7lDw7Rk2bxIzm6i2k7AfACIESZEwzHEp1JVjFPX/+iUfh3T576OwfmrUuQrOhi4AnJASEDLuhQEtdVo2nv2GAWZs0QZ3vp04ttKyrF88yxihSd93AAAAAAAAAA";
      //'cHNidP8BAIUAcQAAAQ/ZVPJIaWXjSEgv7rNJYtlzvDlmQkxmEQ5IQMNe3NlLAQAAAAD/////AkBCDwAAAAAAKloHY3J5cHRvNgVlbXB0eW11dqkUR8BR1OIHfj61MvsaAvcEO5M6KV6IrHnCxQUAAAAAFgAUR8BR1OIHfj61MvsaAvcEO5M6KV4AAAAAAAEA8gBxAAAAAQEhTlsHgE9MRBWNpfhRmOviu2GHSlhq1/85SHQkv/vhLAEAAAAA/////wJAQg8AAAAAACpaB2NyeXB0bzIFZW1wdHltdXapFEfAUdTiB34+tTL7GgL3BDuTOileiKymzNUFAAAAABYAFEfAUdTiB34+tTL7GgL3BDuTOileAkcwRAIgMBXZkJYfLX2ZyNu88FP07P+JYMpN00ggKa4E9gMWtyICIB/kr/p5O4/fsm+CnrUAhAwcsiiwtXm/RM4zEIx71hlwASEDLuhQEtdVo2nv2GAWZs0QZ3vp04ttKyrF88yxihSd93AAAAAAAAAA';

     try {
          psbt = bitcoin.Psbt.fromBase64(unsignedPsbt, { network: DOICHAIN });
          const opCodesStackScript = getNameOPStackScript('test', 'empty', 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk', DOICHAIN);
          psbt.setVersion(VERSION); // for name transactions
          psbt.updateOutput(0, {
              script: opCodesStackScript,
              value: 1000000
          });

          //sign transaction
          // updatedTxOutputs = psbt.txOutputs.map((output, index) => {
          //   console.log("___output", output);
          //   return output;
          // });

          tx = hd.cosignPsbt(psbt).tx; //      tx = (hd as MultisigHDWallet).cosignPsbt(psbt).tx;
        console.log('_____tx', tx.toHex());
    
    } catch (e) {
      console.log("_______e", e.message )       
    }
  });
});