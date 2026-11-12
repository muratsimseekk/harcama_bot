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

export type BildirimDurumu = "granted" | "denied" | "undetermined" | "yok";

/** İzin durumu; bildirim modülü yoksa (Expo Go Android) "yok". Asla izin penceresi açmaz. */
export async function bildirimDurumu(): Promise<BildirimDurumu> {
  if (!Notifications) return "yok";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" || status === "denied" ? status : "undetermined";
  } catch {
    return "yok";
  }
}

/**
 * Expo push token'ı döndürür. `sor` = true ise izin yoksa sistem penceresini açar; false ise
 * yalnız zaten verilmiş izinle çalışır. Expo Go / emülatörde null.
 */
export async function izinVeToken(sor = true): Promise<string | null> {
  if (!Notifications) return null;
  await kanalKur();

  const mevcut = await Notifications.getPermissionsAsync();
  let durum = mevcut.status;
  if (durum !== "granted" && sor) {
    durum = (await Notifications.requestPermissionsAsync()).status;
  }
  // İzin istenebilsin diye cihaz kontrolü izinden sonra (emülatörde pencere yine çıkar)
  if (!Device.isDevice) return null;
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
