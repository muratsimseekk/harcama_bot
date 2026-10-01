import * as Crypto from "expo-crypto";

/**
 * React Native'de WebCrypto (globalThis.crypto) yok. supabase-js PKCE için ona bakıyor;
 * bulamazsa (1) code_verifier'ı Math.random() ile üretiyor, (2) code_challenge'ı SHA-256
 * yerine "plain" gönderiyor — OAuth kodunun ele geçirilmesine karşı koruma zayıflıyor.
 * expo-crypto ile yalnız gereken iki parçayı sağlıyoruz. supabase.ts'ten ÖNCE import edilmeli.
 */
const g = globalThis as unknown as { crypto?: Record<string, unknown> };
const mevcut = g.crypto ?? {};

if (typeof mevcut.getRandomValues !== "function") {
  mevcut.getRandomValues = Crypto.getRandomValues;
}
if (!mevcut.subtle) {
  mevcut.subtle = {
    digest: (algoritma: string | { name: string }, veri: BufferSource): Promise<ArrayBuffer> => {
      const ad = typeof algoritma === "string" ? algoritma : algoritma.name;
      if (ad.toUpperCase() !== "SHA-256") {
        return Promise.reject(new Error(`crypto.subtle.digest: ${ad} desteklenmiyor`));
      }
      return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, veri);
    },
  };
}
g.crypto = mevcut;
