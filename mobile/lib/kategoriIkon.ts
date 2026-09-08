import type { Ionicons } from "@expo/vector-icons";

type Ikon = keyof typeof Ionicons.glyphMap;

// Sıra önemli: ilk eşleşen kazanır → özel kalıplar üstte.
const HARITA: [RegExp, Ikon][] = [
  // faturalar / abonelik
  [/fatura|elektrik|enerji/i, "flash"],
  [/\bsu\b|doğalgaz|dogalgaz|gaz faturası/i, "water"],
  [/internet|wifi|modem|telefon|gsm|hat\b|iletişim/i, "wifi"],
  [/aidat|site yönetim/i, "business"],
  [/abonelik|netflix|spotify|youtube|disney|prime/i, "repeat"],

  // yeme-içme
  [/market|bakkal|manav|süpermarket|market alış|a101|bim|şok|migros|carrefour|gıda/i, "cart"],
  [/kafe|cafe|kahve|starbucks|çay ocağı/i, "cafe"],
  [/restoran|lokanta|yemek|döner|pizza|fast ?food|burger|hamburger|sipariş|yemeksepeti|getir yemek/i, "restaurant"],
  [/sigara|tütün|puro|nargile/i, "flame"],
  [/içki|alkol|bira|rakı|şarap|viski/i, "wine"],

  // ulaşım
  [/uçak|uçuş|bilet|thy|pegasus/i, "airplane"],
  [/otobüs|metro|metrobüs|tramvay|iett|toplu taşıma|akbil|istanbulkart/i, "bus"],
  [/taksi|uber|bitaksi|transfer/i, "car"],
  [/benzin|mazot|motorin|yakıt|akaryakıt|petrol|shell|opet|bp\b/i, "car-sport"],
  [/otopark|park ücreti|hgs|ogs|köprü|otoyol/i, "car"],

  // sağlık & bakım
  [/eczane|ilaç|reçete/i, "medkit"],
  [/doktor|hastane|muayene|tahlil|check ?up|klinik|diş|ortodonti/i, "medical"],
  [/gözlük|optik|lens/i, "glasses"],
  [/kuaför|berber|saç|tıraş|manikür|pedikür|güzellik|spa|bakım/i, "cut"],
  [/spor|gym|fitness|antrenman|pilates|yoga|maç/i, "barbell"],

  // giyim & alışveriş
  [/giyim|kıyafet|tekstil|mont|pantolon|tişört|elbise|gömlek/i, "shirt"],
  [/ayakkabı|bot|sneaker/i, "footsteps"],
  [/çanta|aksesuar|takı|mücevher/i, "bag-handle"],

  // eğlence & kültür
  [/sinema|film|dizi|vizyon/i, "film"],
  [/konser|festival|tiyatro|müze|sergi/i, "musical-notes"],
  [/oyun|steam|playstation|xbox|epic/i, "game-controller"],
  [/kitap|dergi|gazete|kırtasiye/i, "book"],
  [/tatil|otel|konaklama|seyahat|gezi/i, "bed"],

  // ev & yaşam
  [/kira\b|ev kirası|depozito/i, "home"],
  [/ev eşya|mobilya|beyaz eşya|dekorasyon|nevresim/i, "bed"],
  [/tamir|tadilat|boya|badana|usta|tesisat/i, "hammer"],
  [/temizlik|deterjan|hijyen/i, "sparkles"],
  [/evcil|kedi|köpek|mama|veteriner|pet\b/i, "paw"],

  // aile & eğitim
  [/okul|kurs|eğitim|ders|üniversite|harç|kreş|yuva/i, "school"],
  [/çocuk|bebek|oyuncak|bez\b/i, "happy"],
  [/hediye|hediyelik|doğum günü/i, "gift"],
  [/bağış|yardım|sadaka|zekat|fitre/i, "heart"],

  // işletme
  [/hammadde|malzeme|demir|çelik|çelı|alüminyum|aluminyum|sac\b|profil|boru|lama/i, "cube"],
  [/nakliye|kargo|sevkiyat|lojistik|navlun|taşıma/i, "boat"],
  [/personel|maaş|işçi|yevmiye|sgk|prim|bordro|mesai/i, "people"],
  [/makine|ekipman|tezgah|cnc|kompresör|jeneratör/i, "construct"],
  [/galvaniz|kaplama|astar|elektrostatik/i, "color-fill"],
  [/vergi|kdv|stopaj|beyanname|muhasebe|mali müşavir/i, "calculator"],
  [/kira gideri|işyeri kira|dükkan kira|depo kira|fabrika kira/i, "business"],

  // yatırım
  [/bes\b|emeklilik|bireysel emeklilik/i, "shield-checkmark"],
  [/hisse|borsa|bist|midas|temettü|pay senedi/i, "trending-up"],
  [/kripto|bitcoin|btc|ethereum|eth|coin|binance|usdt/i, "logo-bitcoin"],
  [/altın|gram altın|çeyrek|dolar|euro|sterlin|döviz|külçe/i, "diamond"],
  [/fon\b|yatırım fonu|portföy/i, "pie-chart"],
  [/tahvil|bono|eurobond|hazine/i, "document-text"],

  // gelir
  [/maaş geldi|maaş yat|gelir\b/i, "wallet"],
  [/tahsilat|ödeme alındı|para geldi/i, "cash"],
  [/satış|fatura kes/i, "card"],
];

export function kategoriIkon(ad: string): Ikon {
  for (const [re, ikon] of HARITA) if (re.test(ad)) return ikon;
  return "pricetag";
}
