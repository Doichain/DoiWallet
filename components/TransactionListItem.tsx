import { useNavigation } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { Animated, Easing, Image, Linking, Pressable, Text, TextStyle, ViewStyle, StyleSheet, View, useWindowDimensions } from 'react-native';
import Lnurl from '../class/lnurl';
import { LightningTransaction, Transaction } from '../class/wallets/types';
import TransactionExpiredIcon from '../components/icons/TransactionExpiredIcon';
import TransactionIncomingIcon from '../components/icons/TransactionIncomingIcon';
import TransactionOffchainIcon from '../components/icons/TransactionOffchainIcon';
import TransactionOffchainIncomingIcon from '../components/icons/TransactionOffchainIncomingIcon';
import TransactionOnchainIcon from '../components/icons/TransactionOnchainIcon';
import TransactionOutgoingIcon from '../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../components/icons/TransactionPendingIcon';
import loc, { formatBalanceWithoutSuffix, formatTransactionListDate, transactionTimeToReadable } from '../loc';
import { DoichainUnit } from '../models/doichainUnits';
import { NameOpTransaction } from '../types/transaction';
import { getIPFSImageUrl } from '../utils/ipfs';
import { useSettings } from '../hooks/context/useSettings';
import { useTheme } from './themes';
import { Action } from './types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { pop } from '../NavigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import ListItem from './ListItem';

const styles = StyleSheet.create({
  nameOpImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fullWidthButton: {
    width: '100%',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightColumn: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightTitle: {
    textAlign: 'right',
  },
  animatedScaleContainer: {
    width: '100%',
  },
});

type AnimatedPressableRowProps = {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
};

const AnimatedPressableRow: React.FC<AnimatedPressableRowProps> = ({ onPress, children, accessibilityLabel }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.timing(scaleAnim, {
        toValue,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [scaleAnim],
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.animatedScaleContainer, { transform: [{ scale: scaleAnim }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

interface TransactionListItemProps {
  itemPriceUnit: DoichainUnit;
  walletID: string;
  item: Transaction & LightningTransaction; // using type intersection to have less issues with ts
  searchQuery?: string;
  style?: ViewStyle;
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
  onPress?: () => void;
  disableNavigation?: boolean;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const TransactionListItemComponent: React.FC<TransactionListItemProps> = ({
  item,
  itemPriceUnit,
  walletID,
  searchQuery,
  style,
  renderHighlightedText,
  onPress: customOnPress,
  disableNavigation = false,
}: TransactionListItemProps) => {
  const { colors } = useTheme();
  const { navigate } = useNavigation<NavigationProps>();
  const { txMetadata, counterpartyMetadata, addressMetadata, wallets } = useStorage();
  const { language, selectedBlockExplorer } = useSettings();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const containerStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomColor: colors.lightBorder,
    }),
    [colors.background, colors.lightBorder],
  );

  const combinedStyle = useMemo(() => [containerStyle, style], [containerStyle, style]);

  const shortenContactName = (name: string): string => {
    if (name.length < 16) return name;
    return name.substr(0, 7) + '...' + name.substr(name.length - 7, 7);
  };

  let counterparty;
  if (item.counterparty) {
    counterparty = counterpartyMetadata?.[item.counterparty]?.label ?? item.counterparty;
  }
  const txMemo = (counterparty ? `[${shortenContactName(counterparty)}] ` : '') + (txMetadata?.[item.hash]?.memo ?? '');
  const noteForCopy = (txMemo || item.memo || '').trim() || undefined;

  // A name operation shows the name it carries next to the note. A name_new only commits to a hash
  // and carries no name at all, so it is shown by its operation instead of a literal "undefined".
  const nameLabel = useMemo(() => {
    for (const output of item.outputs || []) {
      const nameOp = output?.scriptPubKey?.nameOp;
      if (nameOp) return `[${nameOp.name ?? nameOp.op}]`;
    }
    return undefined;
  }, [item.outputs]);
  // Labels of every address in this tx, comma separated. Not memoized: addressMetadata is mutated in
  // place, so a useMemo keyed on it would return a stale label after every edit.
  const addressLabel = ((): string | undefined => {
    if (!addressMetadata || Object.keys(addressMetadata).length === 0) return undefined;
    const labels = new Set<string>();
    const txAddresses = [
      ...(item.outputs ?? []).flatMap(o => o?.scriptPubKey?.addresses ?? []),
      ...(item.inputs ?? []).flatMap(i => i?.addresses ?? (i?.address ? [i.address] : [])),
    ];
    for (const addr of txAddresses) {
      const label = addressMetadata[addr]?.label;
      if (label) labels.add(label);
    }
    return labels.size > 0 ? [...labels].join(', ') : undefined;
  })();

  // Priority: contact > memo/note > address label > empty.
  const rightSubtitle = counterparty ? noteForCopy : (txMetadata?.[item.hash]?.memo || item.memo || '').trim() || addressLabel;

  // A name operation shows the name it carries in front of whatever upstream puts on the right.
  const rightNote = [nameLabel, rightSubtitle].filter(Boolean).join(' ') || undefined;

  const [ipfsImageUrl, setIpfsImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchIPFSImage = async () => {
      if (!item.outputs) return;

      for (const output of item.outputs) {
        const scriptPubKey = output?.scriptPubKey;
        if (scriptPubKey?.nameOp?.value?.startsWith('ipfs://')) {
          try {
            setIsLoadingImage(true);
            setImageError(null);
            const imageUrl = await getIPFSImageUrl(scriptPubKey.nameOp.value);

            if (imageUrl) {
              setIpfsImageUrl(imageUrl);
              break;
            }
          } catch (error) {
            console.warn('Error fetching IPFS image:', error);
            setImageError(error instanceof Error ? error : new Error('Failed to fetch IPFS image'));
          } finally {
            setIsLoadingImage(false);
          }
        }
      }
    };

    fetchIPFSImage();
  }, [item.outputs]);

  const listTitleKey = useMemo((): 'pending' | 'sent' | 'received' => {
    if (item.category === 'receive' && item.confirmations! < 3) return 'pending';
    if (item.type === 'bitcoind_tx') return item.value! < 0 ? 'sent' : 'received';
    if (item.type === 'paid_invoice') return 'sent';
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (!item.ispaid) return 'pending';
      return 'received';
    }
    if (!item.confirmations) return 'pending';
    return item.value! < 0 ? 'sent' : 'received';
  }, [item.category, item.confirmations, item.type, item.value, item.ispaid]);

  const listTitle = useMemo(() => {
    if (listTitleKey === 'pending') return loc.transactions.pending;
    if (listTitleKey === 'sent') return loc.transactions.list_title_sent;
    return loc.transactions.list_title_received;
  }, [listTitleKey]);

  const isPending = listTitleKey === 'pending';

  const dateLine = useMemo(() => {
    return isPending ? transactionTimeToReadable(item.timestamp) : formatTransactionListDate(item.timestamp * 1000);
    // language in deps so date format updates when locale changes (formatters use global locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, item.timestamp, language]);

  const formattedAmount = useMemo(() => {
    return formatBalanceWithoutSuffix(item.value, itemPriceUnit, true).toString();
  }, [item.value, itemPriceUnit]);

  const rowTitle = useMemo(() => {
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = Math.floor(currentDate.getTime() / 1000);
      const invoiceExpiration = item.timestamp! + item.expire_time!;
      if (invoiceExpiration > now || item.ispaid) {
        return formattedAmount;
      } else {
        return loc.lnd.expired;
      }
    }
    return formattedAmount;
  }, [item, formattedAmount]);

  const rowTitleStyle = useMemo<TextStyle>(() => {
    let color = colors.successColor;

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
      const invoiceExpiration = item.timestamp! + item.expire_time!;

      if (invoiceExpiration > now) {
        color = colors.successColor;
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = colors.successColor;
        } else {
          color = '#9AA0AA';
        }
      }
    } else if (item.value! / 100000000 < 0) {
      color = colors.foregroundColor;
    }

    return {
      color,
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: Math.round(20 * fontScale),
      textAlign: 'right',
      paddingRight: insets.right,
      paddingLeft: insets.left,
    } as TextStyle;
  }, [
    colors.successColor,
    colors.foregroundColor,
    item.type,
    item.value,
    item.timestamp,
    item.expire_time,
    item.ispaid,
    insets.right,
    insets.left,
    fontScale,
  ]);

  const determineTransactionTypeAndAvatar = () => {
    // a name operation whose value points at an IPFS image shows that image as its avatar
    const hasNameOpWithIpfs = (item as NameOpTransaction)?.outputs?.some(output => {
      const scriptPubKey = output?.scriptPubKey;
      return scriptPubKey?.nameOp?.value?.startsWith('ipfs://');
    });

    if (hasNameOpWithIpfs) {
      if (isLoadingImage) {
        return {
          label: loc.transactions.onchain,
          icon: <TransactionPendingIcon />, // Use pending icon while loading
        };
      }

      if (imageError || !ipfsImageUrl) {
        return {
          label: loc.transactions.onchain,
          icon: <TransactionOnchainIcon />, // Fallback to onchain icon on error
        };
      }

      return {
        label: loc.transactions.onchain,
        icon: <Image source={{ uri: ipfsImageUrl }} style={styles.nameOpImage} onError={() => setImageError(new Error('Failed to load image'))} />,
      };
    }

    if (item.category === 'receive' && item.confirmations! < 3) {
      return {
        label: loc.transactions.pending_transaction,
        icon: <TransactionPendingIcon />,
      };
    }

    if (item.type && item.type === 'bitcoind_tx') {
      return {
        label: loc.transactions.onchain,
        icon: <TransactionOnchainIcon />,
      };
    }

    if (item.type === 'paid_invoice') {
      return {
        label: loc.transactions.offchain,
        icon: <TransactionOffchainIcon />,
      };
    }

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
      const invoiceExpiration = item.timestamp! + item.expire_time!;
      if (!item.ispaid && invoiceExpiration < now) {
        return {
          label: loc.transactions.expired_transaction,
          icon: <TransactionExpiredIcon />,
        };
      } else if (!item.ispaid) {
        return {
          label: loc.transactions.expired_transaction,
          icon: <TransactionPendingIcon />,
        };
      } else {
        return {
          label: loc.transactions.incoming_transaction,
          icon: <TransactionOffchainIncomingIcon />,
        };
      }
    }

    if (!item.confirmations) {
      return {
        label: loc.transactions.pending_transaction,
        icon: <TransactionPendingIcon />,
      };
    } else if (item.value! < 0) {
      return {
        label: loc.transactions.outgoing_transaction,
        icon: <TransactionOutgoingIcon />,
      };
    } else {
      return {
        label: loc.transactions.incoming_transaction,
        icon: <TransactionIncomingIcon />,
      };
    }
  };

  const { label: transactionTypeLabel, icon: avatar } = determineTransactionTypeAndAvatar();

  const amountWithUnit = useMemo(() => {
    const unitSuffix = itemPriceUnit === DoichainUnit.DOI || itemPriceUnit === DoichainUnit.SWARTZ ? ` ${itemPriceUnit}` : ' ';
    return `${formattedAmount}${unitSuffix}`;
  }, [formattedAmount, itemPriceUnit]);

  const onPress = useCallback(async () => {
    // If a custom onPress handler was provided, use it and return
    if (customOnPress) {
      customOnPress();
      if (disableNavigation) return;
    }

    if (item.hash) {
      if (renderHighlightedText) {
        pop();
      }
      navigate('TransactionStatus', { hash: item.hash, walletID, tx: item });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice' || item.payment_request) {
      // A settled Arkade swap is an enriched native Ark leg (type 'bitcoind_tx')
      // carrying the swap's invoice payload (payment_request/hash/preimage). Route
      // it to the Lightning invoice view by that payload, not by type — otherwise
      // it falls through to the on-chain TransactionStatus branch below.
      const lightningWallet = wallets.filter(wallet => wallet?.getID() === item.walletID);
      if (lightningWallet.length === 1) {
        try {
          // is it a successful lnurl-pay?
          const LN = new Lnurl(false, AsyncStorage);
          const rawPaymentHash = item.payment_hash;
          if (!rawPaymentHash) throw new Error('Missing payment hash');
          const normalizedPaymentHash =
            typeof rawPaymentHash === 'string' ? rawPaymentHash : uint8ArrayToHex(new Uint8Array((rawPaymentHash as any).data));
          const loaded = await LN.loadSuccessfulPayment(normalizedPaymentHash);
          if (loaded) {
            navigate('ScanLNDInvoiceRoot', {
              screen: 'LnurlPaySuccess',
              params: {
                paymentHash: normalizedPaymentHash,
                justPaid: false,
                fromWalletID: lightningWallet[0].getID(),
              },
            });
            return;
          }
        } catch (e) {
          console.debug(e);
        }

        navigate('LNDViewInvoice', {
          invoice: item,
          walletID: lightningWallet[0].getID(),
        });
      }
    } else if ((item as { txid?: string }).txid) {
      // Hash-less Ark rows carry a synthetic `txid`. Native transfer legs
      // (`ark-…`) open the hash-less-tolerant TransactionStatus detail. Refill
      // rows (`boarding-…` / `boarding-utxo-…`) have no detail surface and are
      // not tappable — matching master, where on-chain top-ups aren't tappable.
      const txid = (item as { txid: string }).txid;
      if (!txid.startsWith('boarding-')) {
        navigate('TransactionStatus', { tx: item, hash: txid, walletID });
      }
    }
  }, [item, renderHighlightedText, navigate, walletID, wallets, customOnPress, disableNavigation]);

  const handleOnDetailsPress = useCallback(() => {
    if (walletID && item && item.hash) {
      navigate('TransactionStatus', { hash: item.hash, walletID, tx: item });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice' || item.payment_request) {
      // Settled Arkade swaps carry invoice data on a 'bitcoind_tx' leg; route by
      // payload so they open the Lightning invoice view (see onPress above).
      const lightningWallet = wallets.find(wallet => wallet?.getID() === item.walletID);
      if (lightningWallet) {
        navigate('LNDViewInvoice', {
          invoice: item,
          walletID: lightningWallet.getID(),
        });
      }
    } else if ((item as { txid?: string }).txid) {
      // Match the regular tap path for Ark non-swap rows: native transfer legs
      // open TransactionStatus; refills (`boarding-…`) are not tappable (master).
      const txid = (item as { txid: string }).txid;
      if (!txid.startsWith('boarding-')) {
        navigate('TransactionStatus', { tx: item, hash: txid, walletID });
      }
    }
  }, [item, navigate, walletID, wallets]);

  const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
  const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(item.hash), [item.hash]);
  const handleOnCopyNote = useCallback(() => Clipboard.setString(noteForCopy ?? ''), [noteForCopy]);
  const handleOnViewOnBlockExplorer = useCallback(() => {
    const url = `${selectedBlockExplorer.url}/tx/${item.hash}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  }, [item.hash, selectedBlockExplorer]);
  const handleCopyOpenInBlockExplorerPress = useCallback(() => {
    Clipboard.setString(`${selectedBlockExplorer.url}/tx/${item.hash}`);
  }, [item.hash, selectedBlockExplorer]);

  const onToolTipPress = useCallback(
    (id: any) => {
      if (id === CommonToolTipActions.CopyAmount.id) {
        handleOnCopyAmountTap();
      } else if (id === CommonToolTipActions.CopyNote.id) {
        handleOnCopyNote();
      } else if (id === CommonToolTipActions.OpenInBlockExplorer.id) {
        handleOnViewOnBlockExplorer();
      } else if (id === CommonToolTipActions.CopyBlockExplorerLink.id) {
        handleCopyOpenInBlockExplorerPress();
      } else if (id === CommonToolTipActions.CopyTXID.id) {
        handleOnCopyTransactionID();
      } else if (id === CommonToolTipActions.Details.id) {
        handleOnDetailsPress();
      }
    },
    [
      handleCopyOpenInBlockExplorerPress,
      handleOnCopyAmountTap,
      handleOnCopyNote,
      handleOnCopyTransactionID,
      handleOnDetailsPress,
      handleOnViewOnBlockExplorer,
    ],
  );
  const toolTipActions = useMemo((): Action[] => {
    const actions: (Action | Action[])[] = [
      {
        ...CommonToolTipActions.CopyAmount,
        hidden: rowTitle === loc.lnd.expired,
      },
      {
        ...CommonToolTipActions.CopyNote,
        hidden: !noteForCopy,
      },
      {
        ...CommonToolTipActions.CopyTXID,
        hidden: !item.hash,
      },
      {
        ...CommonToolTipActions.CopyBlockExplorerLink,
        hidden: !item.hash,
      },
      [{ ...CommonToolTipActions.OpenInBlockExplorer, hidden: !item.hash }, CommonToolTipActions.Details],
    ];

    return actions as Action[];
  }, [rowTitle, noteForCopy, item.hash]);

  const title = listTitle;
  const subtitle = dateLine;
  const subtitleNumberOfLines: number = 1;

  const titleStyle = useMemo(() => ({ color: colors.foregroundColor }), [colors.foregroundColor]);
  const subtitleStyle = useMemo(() => ({ color: colors.alternativeTextColor }), [colors.alternativeTextColor]);

  const subtitleContent = useMemo(() => {
    if (!subtitle) return null;
    const maxLines = subtitleNumberOfLines === 0 ? undefined : subtitleNumberOfLines;

    if (renderHighlightedText && searchQuery) {
      const highlighted = renderHighlightedText(subtitle, searchQuery);
      if (React.isValidElement(highlighted)) {
        const highlightedElement = highlighted as React.ReactElement<{
          numberOfLines?: number;
          style?: TextStyle | TextStyle[];
        }>;
        const existingStyle = highlightedElement.props?.style;
        const mergedStyle: TextStyle[] = (
          Array.isArray(existingStyle)
            ? [styles.subtitle, subtitleStyle, ...existingStyle]
            : [styles.subtitle, subtitleStyle, existingStyle]
        ).filter(Boolean) as TextStyle[];

        return React.cloneElement(highlightedElement, {
          numberOfLines: maxLines,
          style: mergedStyle,
        });
      }
      return highlighted;
    }

    return (
      <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={maxLines}>
        {subtitle}
      </Text>
    );
  }, [subtitle, subtitleNumberOfLines, renderHighlightedText, searchQuery, subtitleStyle]);

  return (
    <ToolTipMenu
      actions={toolTipActions}
      onPressMenuItem={onToolTipPress}
      shouldOpenOnLongPress
      style={styles.fullWidthButton}
      accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}
      accessibilityRole="button"
    >
      <AnimatedPressableRow onPress={onPress} accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}>
        {/* @ts-ignore - Context menu wrapper types can be overly strict about child element props */}
        <ListItem
          leftAvatar={avatar}
          title={listTitle}
          subtitle={dateLine}
          chevron={false}
          rightTitle={rowTitle}
          rightTitleStyle={rowTitleStyle}
          rightSubtitle={rightNote}
          rightSubtitleStyle={styles.rightColumn}
          containerStyle={combinedStyle}
          testID="TransactionListItem"
          accessibilityRole="button"
          accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}
        >
          <View style={styles.row}>
            <View style={styles.avatarContainer}>{avatar}</View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                {title}
              </Text>
              {subtitleContent}
            </View>
            <View style={styles.rightColumn}>
              <Text style={[styles.rightTitle, rowTitleStyle]} numberOfLines={1}>
                {rowTitle}
              </Text>
            </View>
          </View>
        </ListItem>
      </AnimatedPressableRow>
    </ToolTipMenu>
  );
};

export const TransactionListItem = memo(TransactionListItemComponent);
