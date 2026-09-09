import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// expo-notifications, Expo Go SDK 53+ Android'de import anında hata fırlatır
// (push kaldırıldı). Gerçek build'de sorunsuz. Bu yüzden savunmalı yüklüyoruz —
// Expo Go'da modül null olur, tüm fonksiyonlar sessizce no-op döner.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  Notifications = null;
}

async function kanalKur() {
  if (Notifications && Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Genel",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 100, 200],
      });
    } catch {
      /* yoksay */
    }
  }
}

/** İzin ister ve Expo push token'ı döndürür. Expo Go / emülatörde null. */
export async function izinVeToken(): Promise<string | null> {
  if (!Notifications) return null;
  await kanalKur();
  if (!Device.isDevice) return null;

  const mevcut = await Notifications.getPermissionsAsync();
  let durum = mevcut.status;
  if (durum !== "granted") {
    durum = (await Notifications.requestPermissionsAsync()).status;
  }
  if (durum !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // dev/Expo Go — remote push yok

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** Uygulama açıkken anlık yerel bildirim (dev build'de tam çalışır). */
export async function yerelBildirim(baslik: string, govde: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: baslik, body: govde },
      trigger: null,
    });
  } catch {
    /* yoksay */
  }
}

export const platformAdi = Platform.OS;
