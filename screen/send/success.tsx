import React, { useEffect } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import BigNumber from 'bignumber.js';
import LottieView from 'lottie-react-native';
import { Linking, StyleSheet, Text, View } from 'react-native';
import BlueCard from '../../components/BlueCard';
import Button from '../../components/Button';
import { DoichainUnit } from '../../models/doichainUnits';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import HandOffComponent from '../../components/HandOffComponent';
import { HandOffActivityType } from '../../components/types';
import ToolTipMenu from '../../components/TooltipMenu';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList.ts';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList.ts';

type RouteProps = RouteProp<SendDetailsStackParamList, 'Success'>;
type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'Success'>;

const Success = () => {
  const { colors } = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { amount, fee, amountUnit = DoichainUnit.DOI, invoiceDescription = '', txid, walletID, walletType } = route.params || {};
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
    Link: {
      color: colors.buttonTextColor,
    },
    greyButton: {
      backgroundColor: colors.lightButton,
    },
  });

  const onDonePressed = () => {
    // Close SendDetails modal stack and return to the underlying wallet view.
    if (walletID && walletType) {
      (navigation as NativeStackNavigationProp<DetailViewStackParamList>).popTo('WalletTransactions', {
        walletID,
        walletType,
      });
      return;
    }
    navigation.getParent()?.goBack();
  };

  useEffect(() => {
    console.log('send/success - useEffect');
  }, []);

  const actionKeys = {
    CopyToClipboard: 'copyToClipboard',
    GoToWallet: 'goToWallet',
  };

  const actionIcons = {
    Clipboard: {
      iconValue: 'doc.on.doc',
    },
    GoToWallet: {
      iconValue: 'wallet.pass',
    },
  };

  const toolTipMenuActions = [
    {
      id: actionKeys.CopyToClipboard,
      text: loc.transactions.details_copy_block_explorer_link,
      icon: actionIcons.Clipboard,
    },
  ];

  const explorerUrl = txid ? `https://explorer.doichain.org/tx/?txid=${txid}` : 'https://explorer.doichain.org';

  const handleOnPressMenuItem = (id: string) => {
    if (id === actionKeys.CopyToClipboard) Clipboard.setString(explorerUrl);
  };

  const handleOnOpenTransactionOnBlockExplorerTapped = () => {
    const url = explorerUrl;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url).catch(e => {
            console.log(e.message);
          });
        } else {
          console.log('canOpenURL supported is false in handleOnOpenTransactionOnBlockExplorerTapped');
        }
      })
      .catch(e => {
        console.log(e.message);
      });
  };

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <SuccessView amount={amount} amountUnit={amountUnit} fee={fee} invoiceDescription={invoiceDescription} />
      <View style={styles.buttonContainer}>
        <Button onPress={onDonePressed} title={loc.send.success_done} />
      </View>

      <ToolTipMenu
        isButton
        actions={toolTipMenuActions}
        onPressMenuItem={handleOnPressMenuItem}
        onPress={handleOnOpenTransactionOnBlockExplorerTapped}
        buttonStyle={StyleSheet.flatten([styles.greyButton, stylesHook.greyButton])}
      >
        <Text style={stylesHook.Link}>{loc.transactions.details_view_in_browser}</Text>
      </ToolTipMenu>

      {txid && (
        <HandOffComponent
          title={loc.transactions.details_title}
          type={HandOffActivityType.ViewInBlockExplorer}
          url={explorerUrl}
        />
      )}
    </SafeArea>
  );
};

export default Success;

interface SuccessViewParam {
  amount?: number;
  amountUnit?: DoichainUnit;
  fee?: number;
  invoiceDescription?: string;
  shouldAnimate?: boolean;
}

export const SuccessView = ({ amount, amountUnit, fee, invoiceDescription, shouldAnimate = true }: SuccessViewParam) => {
  const { colors } = useTheme();

  let unit: string = '';
  switch (amountUnit) {
    case DoichainUnit.DOI:
    case DoichainUnit.SWARTZ:
      unit = loc.units[amountUnit];
      break;
  }

  const stylesHook = StyleSheet.create({
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
  });

  return (
    <View style={styles.root}>
      {amount || (fee ?? 0) > 0 ? (
        <BlueCard style={styles.amount}>
          <View style={styles.view}>
            {amount ? (
              <>
                <Text style={[styles.amountValue, stylesHook.amountValue]}>{amount}</Text>
                <Text style={[styles.amountUnit, stylesHook.amountUnit]}>{' ' + unit}</Text>
              </>
            ) : null}
          </View>
          {(fee ?? 0) > 0 && (
            <Text style={styles.feeText}>
              {loc.send.create_fee}: {new BigNumber(fee ?? 0).toFixed()} {loc.units[DoichainUnit.DOI]}
            </Text>
          )}
          <Text numberOfLines={0} style={styles.feeText}>
            {invoiceDescription}
          </Text>
        </BlueCard>
      ) : null}

      <View style={styles.ready}>
        <LottieView
          style={styles.lottie}
          source={require('../../img/bluenice.json')}
          autoPlay={shouldAnimate}
          loop={false}
          progress={shouldAnimate ? 0 : 1}
          colorFilters={[
            {
              keypath: 'spark',
              color: colors.success,
            },
            {
              keypath: 'circle',
              color: colors.success,
            },
            {
              keypath: 'Oval',
              color: colors.successCheck,
            },
          ]}
          resizeMode="center"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 19,
  },
  buttonContainer: {
    paddingHorizontal: 58,
    paddingBottom: 16,
  },
  amount: {
    alignItems: 'center',
  },
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '600',
  },
  amountUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  feeText: {
    color: '#37c0a1',
    fontSize: 14,
    marginHorizontal: 4,
    paddingVertical: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 53,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  greyButton: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 40,
  },
});
