/**
 * The rate sources, against the real APIs.
 *
 * One assertion per source and per currency, so a single dead third party cannot hide whether the
 * others answer. The sources are somebody else's servers: Exir is an Iranian exchange that answers
 * 403 to everyone outside Iran, which the old single test asserted a rate from and therefore could
 * never pass. What matters there is not the rate but that the wallet survives losing a source, so
 * that is what is asserted instead.
 */
import DefaultPreference from 'react-native-default-preference';
import assert from 'assert';

import {
  EXCHANGE_RATES_STORAGE_KEY,
  getPreferredCurrency,
  initCurrencyDaemon,
  LAST_UPDATED,
  PREFERRED_CURRENCY_STORAGE_KEY,
  setPreferredCurrency,
  GROUP_IO_BLUEWALLET,
} from '../../blue_modules/currency';
import { FiatUnit } from '../../models/fiatUnit';

jest.setTimeout(90 * 1000);

const storedRates = async () => JSON.parse((await DefaultPreference.get(EXCHANGE_RATES_STORAGE_KEY)) || '{}');

describe('currency', () => {
  beforeAll(async () => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  });

  afterEach(async () => {
    await DefaultPreference.clearAll();
  });

  it('fetches a rate and saves it to DefaultPreference', async () => {
    await initCurrencyDaemon();
    const rates = await storedRates();

    assert.ok(Number.isInteger(rates[LAST_UPDATED]), 'the daemon did not record when it ran');
    assert.ok(rates[LAST_UPDATED] > 0);
    assert.ok(rates.BTC_USD > 0, 'no USD rate');
  });

  it('switches currency when the preference is written directly', async () => {
    await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, FiatUnit.JPY.endPointKey);
    await initCurrencyDaemon(true);

    assert.ok((await storedRates()).BTC_JPY > 0, 'no JPY rate');
  });

  it('switches currency through the setter', async () => {
    await setPreferredCurrency(FiatUnit.EUR);
    await initCurrencyDaemon(true);

    assert.strictEqual((await getPreferredCurrency()).endPointKey, 'EUR');
    assert.ok((await storedRates()).BTC_EUR > 0, 'no EUR rate');
  });

  // one currency per rate source, so it is visible which API is the one that stopped answering
  for (const [unit, source] of [
    [FiatUnit.USD, 'Coinpaprika'],
    [FiatUnit.JPY, 'Kraken'],
    [FiatUnit.ARS, 'Yadio'],
    [FiatUnit.LBP, 'YadioConvert'],
    [FiatUnit.INR, 'coinpaprika'],
  ]) {
    it(`fetches ${unit.endPointKey} from ${source}`, async () => {
      assert.strictEqual(unit.source, source, `${unit.endPointKey} no longer comes from ${source}`);

      await setPreferredCurrency(unit);
      await initCurrencyDaemon(true);

      const rates = await storedRates();
      assert.ok(rates['BTC_' + unit.endPointKey] > 0, `${source} returned no rate for ${unit.endPointKey}`);
      assert.strictEqual(rates.LAST_UPDATED_ERROR, false);
    });
  }

  it('falls back when a source stops answering, and keeps the rates it already had', async () => {
    // Exir serves only Iran and answers 403 here, which makes it a real unreachable source rather
    // than a mocked one. Since BlueWallet 8.0.2 a failing source falls through to the next one, so
    // IRT still gets a rate; the rate already stored for another currency must stay as it was.
    assert.strictEqual(FiatUnit.IRT.source, 'Exir', 'IRT no longer comes from Exir');

    await setPreferredCurrency(FiatUnit.USD);
    await initCurrencyDaemon(true);
    const before = await storedRates();
    assert.ok(before.BTC_USD > 0, 'no USD rate to begin with');

    await setPreferredCurrency(FiatUnit.IRT);
    await initCurrencyDaemon(true);

    const after = await storedRates();
    assert.ok(after.BTC_IRT > 0, 'no IRT rate from the fallback');
    assert.strictEqual(after.BTC_USD, before.BTC_USD, 'the known rate was lost');
  });
});
