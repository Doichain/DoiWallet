import { Transaction, TransactionOutput } from '../class/wallets/types';

export interface NameOpData {
  name: string;
  value: string;
}

export interface NameOpScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
  nameOp?: NameOpData;
}

export interface NameOpOutput {
  value: number;
  n: number;
  scriptPubKey: NameOpScriptPubKey;
}

export type NameOpTransaction = {
  outputs: NameOpOutput[];
}
