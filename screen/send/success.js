import React, { useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import LottieView from 'lottie-react-native';
import PropTypes from 'prop-types';
import { StyleSheet, View, Linking } from "react-native";
import { Text } from '@rneui/themed';
import { BlueCard } from '../../BlueComponents';
import Button from '../../components/Button';
import { DoichainUnit } from "../../models/doichainUnits";
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import HandOffComponent from '../../components/HandOffComponent';
import { HandOffActivityType } from '../../components/types';
import ToolTipMenu from '../../components/TooltipMenu';

const Success = () => {
  const pop = () => {
    getParent().pop();
  };
  const { colors } = useTheme();
  const { getParent } = useNavigation();
  const { amount, fee, amountUnit = DoichainUnit.DOI, invoiceDescription = '', onDonePressed = pop, txid } = useRoute().params;
  
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
  useEffect(() => {
    console.log('send/success - useEffect');
  }, []);

  const actionKeys = {
    CopyToClipboard: "copyToClipboard",
    GoToWallet: "goToWallet",
  };

  const actionIcons = {
    Clipboard: {
      iconValue: "doc.on.doc",
    },
    GoToWallet: {
      iconValue: "wallet.pass",
    },
  };

  const toolTipMenuActions = [
    {
      id: actionKeys.CopyToClipboard,
      text: loc.transactions.copy_link,
      icon: actionIcons.Clipboard,
    },
  ];


  const handleOnOpenTransactionOnBlockExplorerTapped = () => {
    let url = `https://explorer.doichain.org`;
    if (txid) url += `/tx/?txid=${txid}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url).catch((e) => {
            console.log(e.message);
          });
        } else {
          console.log(
            "canOpenURL supported is false in handleOnOpenTransactionOnBlockExplorerTapped"
          );
        }
      })
      .catch((e) => {        
        console.log(e.message);
      });
  };

  return (
    <SafeArea style={[styles.root, stylesHook.root]}>
      <SuccessView
        amount={amount}
        amountUnit={amountUnit}
        fee={fee}
        invoiceDescription={invoiceDescription}
        onDonePressed={onDonePressed}
      />
      <View style={styles.buttonContainer}>
        <Button onPress={onDonePressed} title={loc.send.success_done} />
      </View>

      <ToolTipMenu
        isButton
        actions={toolTipMenuActions}
        // onPressMenuItem={handleCopyPress}
        onPress={handleOnOpenTransactionOnBlockExplorerTapped}
        buttonStyle={StyleSheet.flatten([
          styles.greyButton,
          stylesHook.greyButton,
        ])}        
      >
        <Text style={[styles.Link, stylesHook.Link]}>
          {loc.transactions.details_show_in_block_explorer}
        </Text>
      </ToolTipMenu>

      {txid && (
        <HandOffComponent
          title={loc.transactions.details_title}
          type={HandOffActivityType.ViewInBlockExplorer}
          url={`https://explorer.doichain.org/tx/?txid=${txid}`}         
        />
      )}
    </SafeArea>
  );
};

export default Success;

export const SuccessView = ({ amount, amountUnit, fee, invoiceDescription, shouldAnimate = true }) => {
  const animationRef = useRef();
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    amountValue: {
      color: colors.alternativeTextColor2,
    },
    amountUnit: {
      color: colors.alternativeTextColor2,
    },
  });

  useEffect(() => {
    if (shouldAnimate && animationRef.current) {
      /*
      https://github.com/lottie-react-native/lottie-react-native/issues/832#issuecomment-1008209732
      Temporary workaround until Lottie is fixed.
      */
      setTimeout(() => {
        animationRef.current?.reset();
        animationRef.current?.play();
      }, 100);
    }
  }, [colors, shouldAnimate]);

  return (
    <View style={styles.root}>
      {amount || fee > 0 ? (
        <BlueCard style={styles.amount}>
          <View style={styles.view}>
            {amount ? (
              <>
                <Text style={[styles.amountValue, stylesHook.amountValue]}>{amount}</Text>
                <Text style={[styles.amountUnit, stylesHook.amountUnit]}>{' ' + loc.units[amountUnit]}</Text>
              </>
            ) : null}
          </View>
          {fee > 0 && (
            <Text style={styles.feeText}>
              {loc.send.create_fee}: {new BigNumber(fee).toFixed()} {loc.units[DoichainUnit.DOI]}
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
          ref={animationRef}
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

SuccessView.propTypes = {
  amount: PropTypes.number,
  amountUnit: PropTypes.string,
  fee: PropTypes.number,
  invoiceDescription: PropTypes.string,
  shouldAnimate: PropTypes.bool,
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
    alignItems: "center",
  },
  view: {
    flexDirection: "row",
    justifyContent: "center",
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "600",
  },
  amountUnit: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
  feeText: {
    color: "#37c0a1",
    fontSize: 14,
    marginHorizontal: 4,
    paddingVertical: 6,
    fontWeight: "500",
    alignSelf: "center",
  },
  ready: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    alignItems: "center",
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
