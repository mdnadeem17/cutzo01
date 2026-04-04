import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import type { Id } from '../../convex/_generated/dataModel';

interface PushOptions {
  /** Customer's Firebase UID (if logged in as customer) */
  customerUid?: string | null;
  /** Vendor's ownerId (if logged in as vendor) */
  ownerId?: string | null;
}

export function usePushNotifications({ customerUid, ownerId }: PushOptions) {
  const registerCustomerToken = useMutation(api.pushTokens.registerCustomerToken);
  const registerVendorToken = useMutation(api.pushTokens.registerVendorToken);

  useEffect(() => {
    // Push notifications are only physically capable on Native devices.
    if (!Capacitor.isNativePlatform()) return;

    // Only register once we have an identity to attach the token to
    if (!customerUid && !ownerId) return;

    let isMounted = true;

    const setup = async () => {
      try {
        // Remove previous listeners to avoid doubles
        await PushNotifications.removeAllListeners();

        // Check / request permission
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
          console.warn('[FCM] Notification permission denied');
          return;
        }

        // Listen for token first, THEN call register()
        await PushNotifications.addListener('registration', async (token) => {
          if (!isMounted) return;
          console.log('[FCM] Got token:', token.value.substring(0, 30) + '...');

          try {
            if (ownerId) {
              // Vendor: register token against their shop document
              await registerVendorToken({
                token: token.value,
                ownerId,
              });
              console.log('[FCM] Vendor token saved for ownerId:', ownerId);
            } else if (customerUid) {
              // Customer: register token against their user document
              await registerCustomerToken({
                token: token.value,
                uid: customerUid,
              });
              console.log('[FCM] Customer token saved for uid:', customerUid);
            }
          } catch (err) {
            console.error('[FCM] Failed to save token to backend:', err);
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[FCM] Registration error:', JSON.stringify(err));
        });

        // Show in-app toast when notification arrives while app is open
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast(notification.title || 'New Notification', {
            description: notification.body,
          });
        });

        // Trigger registration (fires 'registration' event above)
        await PushNotifications.register();
      } catch (e) {
        console.error('[FCM] Setup error:', e);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [customerUid, ownerId, registerCustomerToken, registerVendorToken]);
}
