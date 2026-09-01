import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function kanalKur() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Genel",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
    });
  }
}

/** İzin ister ve Expo push token'ı döndürür. Expo Go / emülatörde null. */
export async function izinVeToken(): Promise<string | null> {
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
