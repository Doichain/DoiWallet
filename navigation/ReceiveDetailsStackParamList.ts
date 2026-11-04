import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type HeaderLeftRenderer = NonNullable<NativeStackNavigationOptions['headerLeft']>;
type HeaderRightRenderer = NonNullable<NativeStackNavigationOptions['headerRight']>;

export type ReceiveDetailsStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    allowBIP47?: boolean;
    isBIP47Enabled?: boolean;
    toggleBIP47RequestedAt?: number;
    customLabel?: string;
    customAmount?: string;
    customUnit?: import('../models/doichainUnits').DoichainUnit;
    bip21encoded?: string;
    isCustom?: boolean;
    headerLeft?: HeaderLeftRenderer;
    headerRight?: HeaderRightRenderer;
    headerBackVisible?: boolean;
  };
  ReceiveCustomAmount: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: import('../models/doichainUnits').DoichainUnit;
    preferredUnit?: import('../models/doichainUnits').DoichainUnit;
  };
  ReceiveMoreOptions: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: import('../models/doichainUnits').DoichainUnit;
    preferredUnit?: import('../models/doichainUnits').DoichainUnit;
  };
  ReceiveAddressLabel: {
    address: string;
  };
};
