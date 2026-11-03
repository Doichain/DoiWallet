import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Icon from '@react-native-vector-icons/fontawesome6';

import A from '../../blue_modules/analytics';
import BlueTextCentered from '../../components/BlueTextCentered';
import presentAlert from '../../components/Alert';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { SettingsSection, SettingsListItem } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';

const branch = require('../../current-branch.json');
// written by the build - see scripts/build-time.sh and the gradle task that runs it
const buildTime = require('../../build-time.json');

const About: React.FC = () => {
  const { navigate } = useNavigation();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();

  const handleOnReleaseNotesPress = useCallback(() => {
    navigate('ReleaseNotes');
  }, [navigate]);

  const handleOnSelfTestPress = useCallback(() => {
    if (isElectrumDisabled) {
      presentAlert({ message: loc.settings.about_selftest_electrum_disabled });
    } else {
      navigate('SelfTest');
    }
  }, [isElectrumDisabled, navigate]);

  const handleOnLicensingPress = useCallback(() => {
    navigate('Licensing');
  }, [navigate]);

  const handleOnGithubPress = useCallback(() => {
    Linking.openURL('https://github.com/Doichain/DoiWallet');
  }, []);

  const handleOnRatePress = useCallback(async () => {
    try {
      // the App Store ID upstream links to is BlueWallet's; until DoiWallet has its own listing there,
      // iOS goes to the Doichain site
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://www.doichain.org');
      } else {
        await Linking.openURL('https://play.google.com/store/apps/details?id=org.doichain.doiwallet');
      }
    } catch (error: any) {
      console.error('Rate app failed:', error.message);
    }
  }, []);

  return (
    <SafeAreaScrollView testID="AboutScrollView">
      <View style={styles.center}>
        <Image style={styles.logo} source={require('../../img/icon.png')} />
        <Text style={[styles.textFree, { color: colors.foregroundColor }]}>{loc.settings.about_free}</Text>
        <Text style={[styles.textBackup, { color: colors.alternativeTextColor }]}>
          {formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}
        </Text>
        {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
          <View style={styles.headerButton}>
            <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
          </View>
        )}
      </View>

      <SettingsSection>
        <SettingsListItem
          title={loc.settings.about_sm_github}
          leftAvatar={<Icon name="github" size={24} color={colors.foregroundColor} iconStyle="brand" />}
          onPress={handleOnGithubPress}
          bottomDivider={false}
        />
      </SettingsSection>

      <SettingsSection>
        <View style={styles.builtWithContent}>
          <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>React Native</BlueTextCentered>
          <BlueTextCentered>@doichain/doichainjs-lib</BlueTextCentered>
          <BlueTextCentered>Electrum server</BlueTextCentered>
        </View>
      </SettingsSection>

      <SettingsSection>
        <SettingsListItem title={loc.settings.about_release_notes} iconName="releaseNotes" chevron onPress={handleOnReleaseNotesPress} />
        <SettingsListItem title={loc.settings.about_license} iconName="licensing" chevron onPress={handleOnLicensingPress} />
        <SettingsListItem
          title={loc.settings.about_selftest}
          iconName="selfTest"
          chevron
          onPress={handleOnSelfTestPress}
          testID="RunSelfTestButton"
          bottomDivider={false}
        />
      </SettingsSection>

      <View style={styles.footerContainer}>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
          {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
        </Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
          {new Date(buildTime).toString()}
        </Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>{getBundleId()}</Text>
        <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>Unique ID: {getUniqueIdSync()}</Text>
        <View style={styles.copyToClipboard}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              const stringToCopy = 'userId:' + getUniqueIdSync();
              A.logError('copied unique id');
              Clipboard.setString(stringToCopy);
            }}
          >
            <Text style={[styles.copyToClipboardText, { color: colors.foregroundColor }]}>{loc.transactions.details_copy}</Text>
          </TouchableOpacity>
        </View>
        <BlueSpacing20 />
      </View>
    </SafeAreaScrollView>
  );
};

export default About;

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  textFree: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  textBackup: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  headerButton: {
    marginTop: 16,
  },
  builtWithContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  footerContainer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  copyToClipboard: {
    marginTop: 8,
    alignItems: 'center',
  },
  copyToClipboardText: {
    fontSize: 12,
  },
});
