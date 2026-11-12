export type Tip = "kisisel" | "isletme" | "yatirim";
export type Yon = "gider" | "gelir";
/** Kategoriler işlemlerden bir tür fazlasına sahip: gelir kategorileri bölümden bağımsızdır. */
export type KategoriTip = Tip | "gelir";

export interface Aday {
  aciklama: string;
  tutar: number;
  kategori: string;
  tip: Tip;
  direction: Yon;
  tarih: string; // YYYY-MM-DD
  para_birimi: string;
  emin: boolean;
  neden?: string;
  kategori_onerisi?: string; // kategori boşken AI'ın önerdiği yeni kategori adı
  kaynak?: string; // mobile_manual/mobile_text/mobile_voice — hepsi günlük kayıt hakkına sayılır
  inceleme_sebepleri: string[];
}

export interface CaptureYanit {
  candidates: Aday[];
  needs_review: boolean;
  transcript: string | null;
}

export interface Islem {
  id: string;
  direction: Yon;
  tip: Tip;
  kategori: string;
  aciklama: string;
  tutar: number;
  para_birimi: string;
  tarih: string;
  kaynak: string;
  created_at: string | null;
  ekleyen?: string | null; // hane havuzunda kaydı ekleyen başka üyenin adı
  // Dolar/euro gösteriminde: işlemin kendi gününün kuruyla karşılığı ve o günün kuru (TL).
  cevrilmis?: number | null;
  kur?: number | null;
}

/** Gösterimde kullanılan güncel kur: 1 birim `para` = `deger` TL. */
export interface KurBilgi {
  para: string;
  deger: number;
  tarih: string;
  kaynak: string;
}

export interface GuncelKur {
  tarih: string | null;
  USD: number | null;
  EUR: number | null;
  kaynak: string | null;
}

export type HaneRol = "owner" | "editor" | "viewer";

export interface HaneUye {
  user_id: string;
  ad: string;
  rol: HaneRol;
  ben: boolean;
}

export interface Hane {
  ad: string;
  kod: string;
  rol: HaneRol;
  owner: boolean;
  uyeler: HaneUye[];
}

export interface Ben {
  plan: "free" | "pro"; // etkin plan
  ham_plan?: string; // free | pro
  gunluk_limit: number; // bugünkü toplam kayıt (elle+AI) tavanı — taban + reklamla kazanılan (pro → çok büyük)
  gunluk_enerji: number; // Free katmanının sabit günlük tabanı (reklamsız)
  gun_kayit: number; // bugün eklenen kayıt (elle+AI)
  gun_reklam_kredisi: number; // bugün reklamla kazanılan ek kayıt hakkı
  reklam_kredi_adet: number; // bir reklam izleyince kazanılacak kayıt hakkı
  limit: number; // = gunluk_limit (geriye dönük)
  toplam_kayit: number;
  hane_rol?: HaneRol | null;
}

/** 402 (günlük kayıt hakkı bitti) yanıt gövdesi — api/routes/transactions.py::olustur() */
export interface EnerjiBitti402 {
  kod: "enerji_bitti";
  mesaj: string;
  reklam_izlenebilir: boolean;
  reklam_kredi: number;
  gunluk_limit: number;
  gun_kayit: number;
}

export interface Kategori {
  id: string;
  name: string;
  tip: KategoriTip;
  color: string | null;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
}

export type Granularity = "week" | "month" | "year";

export interface TipKirilim {
  tip: Tip;
  etiket: string;
  tutar: number;
  adet: number;
  oran: number;
}

export interface KategoriKirilim {
  kategori: string;
  tip: Tip;
  tutar: number;
  adet: number;
  oran: number;
}

export interface GunlukNokta {
  tarih: string;
  gider: number;
  gelir: number;
}

export interface OzetGovde {
  toplam_gider: number;
  toplam_gelir: number;
  net: number;
  adet: number;
  tip_kirilim: TipKirilim[];
  kategori_kirilim: KategoriKirilim[];
  gunluk: GunlukNokta[];
  gelir_kirilim?: KategoriKirilim[];
}

export type Kapsam = "genel" | "kategori" | "tip";

export interface HedefIlerleme {
  kapsam: Kapsam;
  kapsam_deger: string | null;
  etiket: string;
  limit: number;
  harcanan: number;
  oran: number;
  kalan: number;
  durum: "iyi" | "yaklasti" | "asti";
}

export interface YatirimKategori {
  kategori: string;
  hedef: number;
  birikmis: number;
  kalan: number;
  oran: number;
}

export interface YatirimIlerleme {
  hedef: number;
  birikmis: number;
  kalan: number;
  oran: number;
  kategoriler?: YatirimKategori[]; // kategori alt hedefleri (eski sunucuda yok)
  alt_toplam?: number;
}

export interface Ozet {
  period: Granularity;
  baslangic: string;
  bitis: string;
  etiket: string;
  bu_donem: OzetGovde;
  onceki: OzetGovde;
  hedefler: HedefIlerleme[];
  yatirim: YatirimIlerleme | null;
  para?: string; // bu_donem/onceki bu cinsten; hedefler/yatırım TL
  kur?: KurBilgi | null;
}

export interface Mevcut {
  aylar: number;
  baslangic: string;
  bitis: string;
  gelir: number;
  gider: number;
  net: number;
  para?: string;
  kur?: KurBilgi | null;
}

export interface Butce {
  id: string;
  kapsam: Kapsam;
  kapsam_deger: string | null;
  limit_amount: number;
  period: string;
}

export interface Hedef {
  id: string;
  hedef_amount: number;
  tip: string;
  period: string;
}

export interface Bildirim {
  tur: "uyari" | "bilgi" | "motivasyon" | "islem";
  baslik: string;
  metin: string;
  grup: string;
  ikon: string;
}

export const TIP_ETIKET: Record<Tip, string> = {
  kisisel: "Kişisel",
  isletme: "İşletme",
  yatirim: "Yatırım",
};

export const KATEGORI_TIP_ETIKET: Record<KategoriTip, string> = { ...TIP_ETIKET, gelir: "Gelir" };

export const TIP_RENK: Record<Tip, string> = {
  kisisel: "#3299FF",
  isletme: "#0068FF",
  yatirim: "#6DB6FE",
};

export const TIP_EMOJI: Record<Tip, string> = {
  kisisel: "👤",
  isletme: "🏭",
  yatirim: "💹",
};

/** Analiz → kategoriler: bir kategorinin seçilen aralık + kıyas dönemindeki toplamı. */
export interface KategoriKiyas {
  kategori: string;
  tip: Tip;
  tutar: number;
  adet: number;
  oran: number;
  onceki_tutar: number;
  degisim: number | null; // % ; null = önceki dönemde yoktu
}

export interface YonKiyas {
  toplam: number;
  onceki_toplam: number;
  degisim: number | null;
  kategoriler: KategoriKiyas[];
}

export interface KategoriKiyasYanit {
  baslangic: string;
  bitis: string;
  onceki_baslangic: string;
  onceki_bitis: string;
  gider: YonKiyas;
  gelir: YonKiyas;
  para: string;
}

export interface AyNokta {
  ay: string; // "2026-11"
  tutar: number;
  adet: number;
  degisim: number | null; // bir önceki aya göre %
}

/** Her ay `gun` günü otomatik eklenen kayıt (kira, fatura, abonelik, maaş …). */
export interface Tekrarlayan {
  id: string;
  aciklama: string;
  tutar: number;
  kategori: string;
  tip: Tip;
  direction: Yon;
  gun: number;
  aktif: boolean;
  baslangic: string;
  son_eklenen: string | null;
  sonraki: string;
}

export interface TekrarlayanIstek {
  aciklama: string;
  tutar: number;
  kategori: string;
  tip: Tip;
  direction: Yon;
  gun: number;
  baslangic?: string;
  son_eklenen?: string;
}

export interface KategoriTrend {
  kategoriler: string[];
  yon: Yon;
  aylar: AyNokta[];
  para: string;
}
