import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import * as bitcoin from '@doichain/doichainjs-lib';
import { DoichainUnit } from '../../models/doichainUnits';
import { DOICHAIN } from '../../blue_modules/network.js';
import React, { useCallback, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, ListRenderItemInfo } from 'react-native';
import presentAlert from '../../components/Alert';
import Icon from '../../components/Icon';
import { SecondButton } from '../../components/SecondButton';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { satoshiToBTC } from '../../blue_modules/currency';
import BlueText from '../../components/BlueText';
import { writeFileAndExport } from '../../blue_modules/fs';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import { useSettings } from '../../hooks/context/useSettings';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { CreateTransactionTarget } from '../../class/wallets/types';

// a recipient, or an input of the PSBT; name outputs carry the name they register or move
type CreateItem = CreateTransactionTarget & {
  index?: number;
  isIncluded?: boolean;
  sig?: unknown;
  nameId?: string;
  nameValue?: string;
};

const SendCreate = () => {
  const { fee, recipients, wallet, memo = '', satoshiPerByte, psbt, showAnimatedQr, tx } =
    useRoute<RouteProp<SendDetailsStackParamList, 'CreateTransaction'>>().params;

  const { txMetadata, fetchAndSaveWalletTransactions } = useStorage();
  const transaction = tx ? bitcoin.Transaction.fromHex(tx) : undefined;
  const size = transaction ? transaction.virtualSize() : 1;
  const { isPrivacyBlurEnabled, isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const navigation = useNavigation();


  // every route into this screen hands over a PSBT; the type only marks it optional
  const inputs: CreateItem[] = (psbt?.data.inputs ?? []).map((input, index) => {
    if (input.witnessUtxo) {
      return {
        address: bitcoin.address.fromOutputScript(input.witnessUtxo.script, DOICHAIN),
        value: Number(input.witnessUtxo.value),
        index,
        sig: input.finalScriptSig || input.finalScriptWitness || input.partialSig,
      };
    } else if (input.nonWitnessUtxo) {
      const txin = psbt!.txInputs[index];
      const txout = bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo).outs[txin.index];
      return {
        address: bitcoin.address.fromOutputScript(txout.script, DOICHAIN),
        value: Number(txout.value),
        index,
        sig: input.finalScriptSig || input.finalScriptWitness || input.partialSig,
      };
    } else {
      throw new Error('Could not get input of #' + index);
    }
  });

  const inputAndOutput: CreateItem[] = [...inputs, ...(recipients as CreateItem[])];

  // console.log("____inputAndOutput___", inputAndOutput);

  // const [isLoading, setIsLoading] = useState(true);
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const broadcast = async () => {
    // setIsLoading(true);
    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        // setIsLoading(false);
        return;
      }
    }
    try {
      if (!(await BlueElectrum.ensureConnected())) {
        throw new Error(loc.errors.network);
      }
      if (!wallet) throw new Error('No wallet to broadcast from');
      const result = await wallet.broadcastTx(tx);
      if (result) {
        //  setIsLoading(false);
        const txDecoded = bitcoin.Transaction.fromHex(tx);
        const txid = txDecoded.getId();
        // Notifications.majorTomToGroundControl([], [], [txid]);
        if (memo) {
          txMetadata[txid] = { memo };
        }
        navigation.navigate('Success', {
          amount: undefined,
          txid,
        });
        await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        fetchAndSaveWalletTransactions(wallet.getID());
      } else {
        /*
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          setIsLoading(false);
          */
        presentAlert({ message: loc.errors.broadcast });
      }
    } catch (error: any) {
      /*
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        */
      presentAlert({ message: error.message });
    }
  };

  const styleHooks = StyleSheet.create({
    transactionDetailsTitle: {
      color: colors.feeText,
    },
    transactionDetailsTitleRed: {
      color: colors.redText,
    },
    transactionDetailsSubtitle: {
      color: colors.foregroundColor,
    },
    separator: {
      backgroundColor: colors.inputBorderColor,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    cardText: {
      color: colors.foregroundColor,
    },
  });

  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  useEffect(() => {
    console.log('send/create - useEffect');
    if (isPrivacyBlurEnabled) {
      enableScreenProtect();
    }
    return () => {
      disableScreenProtect();
    };
  }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]);

  const exportTXN = useCallback(async () => {
    const fileName = `${Date.now()}.txn`;
    await writeFileAndExport(fileName, tx, false);
  }, [tx]);

  const renderHeaderRight = useCallback(
    () => (
      <Pressable accessibilityRole="button" onPress={exportTXN} style={({ pressed }) => pressed && styles.iconPressablePressed}>
        <Icon size={22} name="share-alternative" type="entypo" color={colors.foregroundColor} />
      </Pressable>
    ),
    [colors.foregroundColor, exportTXN],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const _renderItem = ({ index, item }: ListRenderItemInfo<CreateItem>) => {
    return (
      <>
        <View>
          {item.index !== undefined ? (
            <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.transactions.details_inputs}</Text>
          ) : item.isIncluded !== true ? (
            <Text style={[styles.transactionDetailsTitleRed, styleHooks.transactionDetailsTitleRed]}>{loc.send.foreign_address}</Text>
          ) : (
            <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_to}</Text>
          )}
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{item.address}</Text>
          <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_amount}</Text>
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>
            {item.value != null ? `${satoshiToBTC(item.value)} ${DoichainUnit.DOI}` : '-'}
          </Text>
          {item.index !== undefined && (
            <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>
              {loc.send.input_index}: {item.index}
            </Text>
          )}

          {item.sig !== undefined && <Text style={[styles.transactionDetailsTitleRed, styleHooks.transactionDetailsTitleRed]}>Signed</Text>}

          {item.nameId !== undefined && (
            <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.name}</Text>
          )}
          {item.nameId !== undefined && (
            <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{item.nameId}</Text>
          )}
          {item.nameValue !== undefined && (
            <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.broadcast_value}</Text>
          )}
          {item.nameValue !== undefined && (
            <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{item.nameValue}</Text>
          )}
          {inputAndOutput.length > 1 && (
            <BlueText style={styles.itemOf}>
              {loc.formatString(loc._.of, {
                number: index + 1,
                total: inputAndOutput.length,
              })}
            </BlueText>
          )}
        </View>
      </>
    );
  };

  const renderSeparator = () => {
    return <View style={[styles.separator, styleHooks.separator]} />;
  };

  const ListHeaderComponent = (
    <View>
      {showAnimatedQr && psbt ? (
        <>
          <BlueSpacing20 />
          <DynamicQRCode value={psbt!.toHex()} />
          <BlueSpacing20 />
        </>
      ) : null}
      <BlueText style={[styles.cardText, styleHooks.cardText]}>{loc.send.create_this_is_hex}</BlueText>
      <TextInput testID="TxhexInput" style={styles.cardTx} multiline editable={false} value={tx || psbt?.toBase64()} />

      <TouchableOpacity accessibilityRole="button" style={styles.actionTouch} onPress={() => Clipboard.setString(tx || psbt?.toBase64() || '')}>
        <Text style={styles.actionText}>{loc.send.create_copy}</Text>
      </TouchableOpacity>

      <SecondButton disabled={isElectrumDisabled} onPress={broadcast} title={loc.send.broadcast} testID="PsbtBroadcastTransactionButton" />
    </View>
  );

  const ListFooterComponent = (
    <View>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_fee}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>
        {new BigNumber(fee).toFixed()} {DoichainUnit.DOI}
      </Text>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_tx_size}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{size} vbytes</Text>
      <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_satoshi_per_vbyte}</Text>
      <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{satoshiPerByte} Swartz/vB</Text>
      {memo?.length > 0 && (
        <>
          <Text style={[styles.transactionDetailsTitle, styleHooks.transactionDetailsTitle]}>{loc.send.create_memo}</Text>
          <Text style={[styles.transactionDetailsSubtitle, styleHooks.transactionDetailsSubtitle]}>{memo}</Text>
        </>
      )}
    </View>
  );

  return (
    <FlatList<CreateTransactionTarget>
      contentContainerStyle={[styles.root, styleHooks.root]}
      extraData={inputAndOutput}
      data={inputAndOutput}
      renderItem={_renderItem}
      keyExtractor={(_item, index) => `${index}`}
      ItemSeparatorComponent={renderSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
    />
  );
};

export default SendCreate;

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsTitleRed: {
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  root: {
    paddingHorizontal: 20,
  },
  transactionDetailsSubtitle: {
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  itemOf: {
    alignSelf: 'flex-end',
  },
  separator: {
    height: 0.5,
    marginVertical: 16,
  },
  cardText: {
    fontWeight: '500',
  },
  cardTx: {
    borderColor: '#ebebeb',
    backgroundColor: '#d2f8d6',
    borderRadius: 4,
    marginTop: 20,
    color: '#37c0a1',
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
    height: 72,
  },
  actionTouch: {
    marginVertical: 24,
  },
  iconPressablePressed: {
    opacity: 0.6,
  },
  actionText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
});
