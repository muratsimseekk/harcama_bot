export type Tip = "kisisel" | "isletme" | "yatirim";
export type Yon = "gider" | "gelir";

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
  kaynak?: string; // capture'dan gelen adaylarda mobile_text/mobile_voice → AI limitine sayılır
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
  plan: "base" | "pro"; // etkin plan
  ham_plan?: string; // trial | base | pro
  trial_bitis?: string | null;
  ai_limit: number;
  base_ai_limit: number; // Base katmanının sabit aylık tavanı
  ay_kayit: number; // bu ay kullanılan AI kaydı
  limit: number; // = ai_limit (geriye dönük)
  toplam_kayit: number;
  hane_rol?: HaneRol | null;
}

export interface Kategori {
  id: string;
  name: string;
  tip: Tip;
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

export interface YatirimIlerleme {
  hedef: number;
  birikmis: number;
  kalan: number;
  oran: number;
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
