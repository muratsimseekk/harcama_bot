import type { Ionicons } from "@expo/vector-icons";

type Ikon = keyof typeof Ionicons.glyphMap;

const HARITA: [RegExp, Ikon][] = [
  [/market|bakkal|manav/i, "cart-outline"],
  [/kafe|restoran|yemek|kahve|çay|cay/i, "cafe-outline"],
  [/sigara|içecek|icecek|alkol/i, "wine-outline"],
  [/ulaşım|ulasim|otobüs|taksi|metro|benzin|yakıt|yakit|araç|arac|otopark/i, "car-outline"],
  [/sağlık|saglik|hastane|eczane|ilaç|ilac|doktor/i, "medkit-outline"],
  [/giyim|kıyafet|kiyafet|ayakkabı|ayakkabi/i, "shirt-outline"],
  [/eğlence|eglence|sinema|oyun|konser/i, "game-controller-outline"],
  [/fatura|elektrik|su|doğalgaz|dogalgaz/i, "flash-outline"],
  [/telefon|internet|hat/i, "wifi-outline"],
  [/kira/i, "home-outline"],
  [/personel|maaş|maas|işçi|isci/i, "people-outline"],
  [/hammadde|malzeme|demir|çelik|celik|alüminyum|aluminyum/i, "cube-outline"],
  [/nakliye|kargo|sevkiyat|lojistik/i, "boat-outline"],
  [/makine|ekipman|tezgah/i, "construct-outline"],
  [/galvaniz|kaplama/i, "color-fill-outline"],
  [/bes|emeklilik/i, "shield-checkmark-outline"],
  [/hisse|borsa|bist/i, "trending-up-outline"],
  [/kripto|bitcoin|coin/i, "logo-bitcoin"],
  [/altın|altin|döviz|doviz|dolar|euro/i, "cash-outline"],
  [/fon|tahvil|bono/i, "briefcase-outline"],
];

export function kategoriIkon(ad: string): Ikon {
  for (const [re, ikon] of HARITA) if (re.test(ad)) return ikon;
  return "pricetag-outline";
}
