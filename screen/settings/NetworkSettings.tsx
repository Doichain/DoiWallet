import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform } from 'react-native';
import loc from '../../loc';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';

const NetworkSettings: React.FC = () => {
  const navigation = useNavigation();
  const isNotificationsCapable = Platform.OS !== 'web';
  const navigateToElectrumSettings = () => {
    navigation.navigate('ElectrumSettings');
  };

  const navigateToBlockExplorerSettings = () => {
    navigation.navigate('SettingsBlockExplorer');
  };

  const navigateToNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  return (
    <SettingsScrollView>
      <SettingsSection>
        <SettingsListItem
          title={loc.settings.block_explorer}
          iconName="blockExplorer"
          onPress={navigateToBlockExplorerSettings}
          testID="BlockExplorerSettings"
          chevron
        />

        <SettingsListItem
          title={loc.settings.network_electrum}
          iconName="electrum"
          onPress={navigateToElectrumSettings}
          testID="ElectrumSettings"
          chevron
          bottomDivider={isNotificationsCapable}
        />

        {/* no Lightning settings: this fork has no Lightning wallet */}
        {isNotificationsCapable && (
          <SettingsListItem
            title={loc.settings.notifications}
            iconName="notifications"
            onPress={navigateToNotificationSettings}
            testID="NotificationSettings"
            chevron
            bottomDivider={false}
          />
        )}
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default NetworkSettings;
