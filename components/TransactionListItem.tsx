import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { Image, Linking, View, ViewStyle } from 'react-native';
import Lnurl from '../class/lnurl';
import {Transaction } from '../class/wallets/types';
import { NameOpTransaction, NameOpOutput } from '../types/transaction';
import TransactionExpiredIcon from '../components/icons/TransactionExpiredIcon';
import TransactionIncomingIcon from '../components/icons/TransactionIncomingIcon';
import TransactionOffchainIcon from '../components/icons/TransactionOffchainIcon';
import TransactionOffchainIncomingIcon from '../components/icons/TransactionOffchainIncomingIcon';
import TransactionOnchainIcon from '../components/icons/TransactionOnchainIcon';
import TransactionOutgoingIcon from '../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../components/icons/TransactionPendingIcon';
import loc, { formatBalanceWithoutSuffix, transactionTimeToReadable } from '../loc';
import { DoichainUnit } from "../models/doichainUnits";
import { useSettings } from '../hooks/context/useSettings';
import ListItem from './ListItem';
import { useTheme } from './themes';
import { Action, ToolTipMenuProps } from './types';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { pop } from '../NavigationService';
import { getIPFSImageUrl } from '../utils/ipfs';

interface TransactionListItemProps {
  itemPriceUnit: DoichainUnit;
  walletID: string;
  item: Transaction & Partial<NameOpTransaction>; // using type intersection to have less issues with ts
  searchQuery?: string;
  style?: ViewStyle;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

export const TransactionListItem: React.FC<TransactionListItemProps> = React.memo(
  ({ item, itemPriceUnit = DoichainUnit.DOI, walletID, searchQuery, style, renderHighlightedText }) => {
    const [subtitleNumberOfLines, setSubtitleNumberOfLines] = useState(1);
    const { colors } = useTheme();
    const { navigate } = useExtendedNavigation<NavigationProps>();
    const menuRef = useRef<ToolTipMenuProps>();
    const { txMetadata, counterpartyMetadata, wallets } = useStorage();
    const { language } = useSettings();
    const containerStyle = useMemo(
      () => ({
        backgroundColor: 'transparent',
        borderBottomColor: colors.lightBorder,
      }),
      [colors.lightBorder],
    );

    const combinedStyle = useMemo(() => [containerStyle, style], [containerStyle, style]);

    const shortenContactName = (name: string): string => {
      if (name.length < 16) return name;
      return name.substr(0, 7) + '...' + name.substr(name.length - 7, 7);
    };

    const title = useMemo(() => {
      if (item.confirmations === 0) {
        return loc.transactions.pending;
      } else {
        return transactionTimeToReadable(item.received!);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.confirmations, item.received, language]);

    let counterparty;
    if (item.counterparty) {
      counterparty = counterpartyMetadata?.[item.counterparty]?.label ?? item.counterparty;
    }

    const txMemo = (counterparty ? `[${shortenContactName(counterparty)}] ` : '') + (txMetadata[item.hash]?.memo ?? '');
    const subtitle = useMemo(() => {
      let sub = '';
      // Check for nameOp with IPFS URL
      for (const output of item.outputs || []) {
        if (output?.scriptPubKey?.nameOp) {          
          sub = `[${output.scriptPubKey.nameOp.name}] `;
          break;
        }
      }
      sub += Number(item.confirmations) < 7 ? loc.formatString(loc.transactions.list_conf, { number: item.confirmations }) : '';
      if (sub !== '') sub += ' ';
      
      sub += txMemo;
      if (item.memo) sub += item.memo;
      return sub || undefined;
    }, [txMemo, item.confirmations, item.memo, item.outputs]);

    const rowTitle = useMemo(() => {
      if (item.type === 'user_invoice' || item.type === 'payment_request') {
        if (isNaN(Number(item.value))) {
          item.value = 0;
        }
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
        const invoiceExpiration = item.timestamp! + item.expire_time!;

        if (invoiceExpiration > now) {
          return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
        } else {
          if (item.ispaid) {
            return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
          } else {
            return loc.lnd.expired;
          }
        }
      } else {
        return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
      }
    }, [item, itemPriceUnit]);

    const rowTitleStyle = useMemo(() => {
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
        fontWeight: '600',
        textAlign: 'right',
      };
    }, [item, colors.foregroundColor, colors.successColor]);

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

    const determineTransactionTypeAndAvatar = () => {
      // Check for nameOp transactions with IPFS images
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
          icon: (
            <Image
              source={{ uri: ipfsImageUrl }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
              onError={() => setImageError(new Error('Failed to load image'))}
            />
          ),
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
      const amount = formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
      const unit = itemPriceUnit === DoichainUnit.DOI || itemPriceUnit === DoichainUnit.SWARTZ ? ` ${itemPriceUnit}` : ' ';
      return `${amount}${unit}`;
    }, [item.value, itemPriceUnit]);

    useEffect(() => {
      setSubtitleNumberOfLines(1);
    }, [subtitle]);

    const onPress = useCallback(async () => {
      menuRef?.current?.dismissMenu?.();
      if (item.hash) {
        if (renderHighlightedText) {
          pop();
        }
        navigate('TransactionStatus', { hash: item.hash, walletID });
      } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') {
        const lightningWallet = wallets.filter(wallet => wallet?.getID() === item.walletID);
        if (lightningWallet.length === 1) {
          try {
            // is it a successful lnurl-pay?
            const LN = new Lnurl(false, AsyncStorage);
            let paymentHash = item.payment_hash!;
            if (typeof paymentHash === 'object') {
              paymentHash = Buffer.from(paymentHash.data).toString('hex');
            }
            const loaded = await LN.loadSuccessfulPayment(paymentHash);
            if (loaded) {
              navigate('ScanLndInvoiceRoot', {
                screen: 'LnurlPaySuccess',
                params: {
                  paymentHash,
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
      }
    }, [item, renderHighlightedText, navigate, walletID, wallets]);

    const handleOnExpandNote = useCallback(() => {
      setSubtitleNumberOfLines(0);
    }, []);

    const subtitleProps = useMemo(() => ({ numberOfLines: subtitleNumberOfLines }), [subtitleNumberOfLines]);

    const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
    const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(item.hash), [item.hash]);
    const handleOnCopyNote = useCallback(() => Clipboard.setString(subtitle ?? ''), [subtitle]);
    const handleOnViewOnBlockExplorer = useCallback(() => {
      const url = `https://mempool.space/tx/${item.hash}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        }
      });
    }, [item.hash]);
    const handleCopyOpenInBlockExplorerPress = useCallback(() => {
      Clipboard.setString(`https://mempool.space/tx/${item.hash}`);
    }, [item.hash]);

    const onToolTipPress = useCallback(
      (id: any) => {
        if (id === CommonToolTipActions.CopyAmount.id) {
          handleOnCopyAmountTap();
        } else if (id === CommonToolTipActions.CopyNote.id) {
          handleOnCopyNote();
        } else if (id === CommonToolTipActions.OpenInBlockExplorer.id) {
          handleOnViewOnBlockExplorer();
        } else if (id === CommonToolTipActions.ExpandNote.id) {
          handleOnExpandNote();
        } else if (id === CommonToolTipActions.CopyBlockExplorerLink.id) {
          handleCopyOpenInBlockExplorerPress();
        } else if (id === CommonToolTipActions.CopyTXID.id) {
          handleOnCopyTransactionID();
        }
      },
      [
        handleCopyOpenInBlockExplorerPress,
        handleOnCopyAmountTap,
        handleOnCopyNote,
        handleOnCopyTransactionID,
        handleOnExpandNote,
        handleOnViewOnBlockExplorer,
      ],
    );
    const toolTipActions = useMemo((): Action[] | Action[][] => {
      const actions: (Action | Action[])[] = [];

      if (rowTitle !== loc.lnd.expired) {
        actions.push(CommonToolTipActions.CopyAmount);
      }

      if (subtitle) {
        actions.push(CommonToolTipActions.CopyNote);
      }

      if (item.hash) {
        actions.push(CommonToolTipActions.CopyTXID, CommonToolTipActions.CopyBlockExplorerLink, [CommonToolTipActions.OpenInBlockExplorer]);
      }

      if (subtitle && subtitleNumberOfLines === 1) {
        actions.push([CommonToolTipActions.ExpandNote]);
      }

      return actions as Action[] | Action[][];
    }, [item.hash, subtitle, rowTitle, subtitleNumberOfLines]);

    const accessibilityState = useMemo(() => {
      return {
        expanded: subtitleNumberOfLines === 0,
      };
    }, [subtitleNumberOfLines]);

    return (
      <ToolTipMenu
        isButton
        actions={toolTipActions}
        onPressMenuItem={onToolTipPress}
        onPress={onPress}
        accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}
        accessibilityRole="button"
        accessibilityState={accessibilityState}
      >
        <ListItem
          leftAvatar={avatar}
          title={title}
          subtitleNumberOfLines={subtitleNumberOfLines}
          subtitle={subtitle ? (renderHighlightedText ? renderHighlightedText(subtitle, searchQuery ?? '') : subtitle) : undefined}
          Component={View}
          subtitleProps={subtitleProps}
          chevron={false}
          rightTitle={rowTitle}
          rightTitleStyle={rowTitleStyle}
          containerStyle={combinedStyle}
        />
      </ToolTipMenu>
    );
  },
);
