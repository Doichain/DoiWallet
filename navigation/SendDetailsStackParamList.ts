import { Psbt } from '@doichain/doichainjs-lib';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet, Utxo } from '../class/wallets/types';
import { DoichainUnit, Chain } from '../models/doichainUnits';
import { ScanQRCodeParamList } from './DetailViewStackParamList';
import { IFee } from '../screen/send/SendDetails';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

export interface NameOpParams {
  nameId: string;
  nameValue: string;
  sendTo: string;
  /**
   * The output the chain says currently holds the name, from the ElectrumX name index. Picking the
   * input by holder address instead was wrong: a wallet reuses its addresses, so one address can
   * hold several names at once - seven of them on a single address in our own regtest runs - and
   * nothing said which one would be found (Doichain/DoiWallet#35).
   *
   * Absent for a first registration, which has no previous output to spend.
   */
  nameOutpoint?: { txid: string; vout: number };
}
type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;

export const CoinControlSortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type CoinControlSortDirection = (typeof CoinControlSortDirection)[keyof typeof CoinControlSortDirection];

export const CoinControlSortType = {
  HEIGHT: 'height',
  LABEL: 'label',
  VALUE: 'value',
  FROZEN: 'frozen',
} as const;
export type CoinControlSortType = (typeof CoinControlSortType)[keyof typeof CoinControlSortType];

export type SendDetailsParams = {
  transactionMemo?: string;
  memo?: string;
  isTransactionReplaceable?: boolean;
  payjoinUrl?: string;
  feeUnit?: DoichainUnit;
  frozenBalance?: number;
  amountUnit?: DoichainUnit;
  address?: string;
  amount?: number;
  amountSats?: number;
  unit?: DoichainUnit;
  onBarScanned?: string;
  noRbf?: boolean;
  walletID: string;
  launchedBy?: string;
  utxos?: CreateTransactionUtxo[] | null;
  isEditable?: boolean;
  uri?: string;
  paymentCode?: string;
  selectedFeeRate?: string | undefined;
  selectedFeeType?: NetworkTransactionFeeType;
  addRecipientParams?: {
    address: string;
    amount?: number;
    memo?: string;
  };
  nameOp?: NameOpParams;
};

export type TNavigation = {
  pop: () => void;
  navigate: () => void;
};

export type TNavigationWrapper = {
  navigation: TNavigation;
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams & {
    headerRight?: HeaderRightRenderer;
  };
  CoinControlOutput: {
    walletID: string;
    utxo: Utxo;
  };
  SelectFee: {
    networkTransactionFees: {
      fastestFee: number;
      mediumFee: number;
      slowFee: number;
    };
    feePrecalc: IFee;
    feeRate: string;
    feeUnit?: DoichainUnit;
    walletID: string;
    customFee?: string | null;
  };
  Confirm: {
    fee: number;
    memo?: string;
    walletID: string;
    tx: string;
    targets?: CreateTransactionTarget[]; // needed to know if there were paymentCodes, which turned into addresses in `recipients`
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    payjoinUrl?: string | null;
    psbt: Psbt;
    headerRight?: HeaderRightRenderer;
  };
  PsbtWithHardwareWallet: {
    memo?: string;
    walletID: string;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
    deepLinkPSBT?: string;
    onBarScanned?: string;
  };
  PsbtRaw: {
    psbtBase64: string;
  };
  CreateTransaction: {
    memo?: string;
    wallet?: TWallet;
    psbt?: Psbt;
    txhex?: string;
    tx: string;
    fee: number;
    showAnimatedQr?: boolean;
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    feeSatoshi?: number;
    headerRight?: HeaderRightRenderer;
  };
  PsbtMultisig: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
  };
  PsbtMultisigQRCode: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
    isShowOpenScanner?: boolean;
    onBarScanned?: string;
  };
  Success: {
    fee?: number;
    amount: number;
    amountUnit?: DoichainUnit;
    txid?: string;
    invoiceDescription?: string;
    walletID?: string;
    walletType?: string;
  };
  SelectWallet: {
    chainType?: Chain;
    onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
    availableWallets?: TWallet[];
    noWalletExplanationText?: string;
    onChainRequireSend?: boolean;
    selectedWalletID?: string; // Add this parameter to scroll to a specific wallet
  };
  CoinControl: {
    walletID: string;
    sortDirection?: CoinControlSortDirection;
    sortType?: CoinControlSortType;
    hasUtxos?: boolean;
  };
  PaymentCodeList: {
    walletID: string;
    merge?: boolean;
  };
  ScanQRCode: ScanQRCodeParamList;
};
