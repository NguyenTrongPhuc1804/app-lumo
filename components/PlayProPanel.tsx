import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ErrorCode, deepLinkToSubscriptions, getAvailablePurchases, useIAP } from 'expo-iap';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { withErrorDetail } from '../lib/auth-account-format';
import { verifyPlayPro, type AuthUser } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';

type ProMessageKey = 'proSignInAgain' | 'proVerified' | 'proPaymentPending' | 'proVerifyFailed'
  | 'proPurchaseFailed' | 'proFetchFailed' | 'proOpenPurchaseFailed' | 'proNotFound' | 'proRestoreFailed' | 'proOpenPlayFailed';

export default function PlayProPanel({ user }: { user: AuthUser }) {
  const { styles } = useTheme();
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState<{ key: ProMessageKey; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const plan = user.playPro!;

  const verify = async (purchaseToken: string) => {
    const { token, user: current, reloadMe } = useAuthStore.getState();
    if (!token || current?.id !== user.id) {
      setMessage({ key: 'proSignInAgain' });
      return;
    }
    await verifyPlayPro(useConfigStore.getState().serverUrl, token, purchaseToken);
    await reloadMe();
    setMessage({ key: 'proVerified' });
  };

  const billing = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (purchase.productId !== plan.productId || !purchase.purchaseToken) return;
      try {
        if (purchase.purchaseState !== 'purchased') setMessage({ key: 'proPaymentPending' });
        else await verify(purchase.purchaseToken);
      } catch (err) {
        setMessage({ key: 'proVerifyFailed', detail: err instanceof Error ? err.message : undefined });
      } finally {
        setBusy(false);
      }
    },
    onPurchaseError: (error) => {
      setBusy(false);
      if (error.code !== ErrorCode.UserCancelled) setMessage({ key: 'proPurchaseFailed' });
    },
  });

  const { connected, fetchProducts } = billing;
  useEffect(() => {
    if (connected) fetchProducts({ skus: [plan.productId], type: 'subs' }).catch(() => setMessage({ key: 'proFetchFailed' }));
  }, [connected, fetchProducts, plan.productId]);

  const product = billing.subscriptions.find((item) => item.id === plan.productId && item.platform === 'android');
  const offer = product?.subscriptionOffers?.find((item) => item.basePlanIdAndroid === plan.basePlanId &&
    (!item.id || item.id === plan.basePlanId));

  const buy = async () => {
    if (!offer?.offerTokenAndroid) return;
    setBusy(true);
    setMessage(null);
    try {
      await billing.requestPurchase({ type: 'subs', request: { google: {
        skus: [plan.productId], obfuscatedAccountId: plan.accountId,
        subscriptionOffers: [{ sku: plan.productId, offerToken: offer.offerTokenAndroid }],
      } } });
    } catch (err) {
      setBusy(false);
      if ((err as { code?: string })?.code !== ErrorCode.UserCancelled) setMessage({ key: 'proOpenPurchaseFailed' });
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const purchases = await getAvailablePurchases();
      const purchase = purchases.find((item) => item.productId === plan.productId && item.purchaseState === 'purchased');
      if (!purchase?.purchaseToken) setMessage({ key: 'proNotFound' });
      else await verify(purchase.purchaseToken);
    } catch (err) {
      setMessage({ key: 'proRestoreFailed', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>{t('account.proPlan')}</Text>
    <Text style={styles.hint}>{t('pro.proMonthlyCoins', { count: plan.monthlyCoins, amount: plan.monthlyCoins.toLocaleString(i18n.language) })}</Text>
    {user.proExpiresAt && <Text style={styles.hint}>{t('pro.proExpires', { date: new Date(user.proExpiresAt).toLocaleDateString(i18n.language) })}</Text>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.hint}>{withErrorDetail(t(`pro.${message.key}`), message.detail)}</Text> : null}
    {!user.proExpiresAt && offer?.offerTokenAndroid && <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} style={styles.secondaryButton} onPress={buy}>
      <Text style={styles.secondaryButtonText}>{t('pro.proUpgrade', { price: offer.displayPrice })}</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !connected, busy }} disabled={busy || !connected} style={styles.secondaryButton} onPress={restore}>
      <Text style={styles.secondaryButtonText}>{t('pro.proRestore')}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} style={styles.secondaryButton} onPress={() => {
      deepLinkToSubscriptions({ skuAndroid: plan.productId, packageNameAndroid: 'com.lumolens.app' }).catch(() => setMessage({ key: 'proOpenPlayFailed' }));
    }}><Text style={styles.secondaryButtonText}>{t('pro.proManage')}</Text></Pressable>
  </View>;
}
