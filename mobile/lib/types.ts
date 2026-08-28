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
}

export interface Ben {
  plan: string;
  ay_kayit: number;
  limit: number;
  toplam_kayit: number;
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

export interface Ozet {
  period: Granularity;
  baslangic: string;
  bitis: string;
  etiket: string;
  bu_donem: OzetGovde;
  onceki: OzetGovde;
}

export const TIP_ETIKET: Record<Tip, string> = {
  kisisel: "Kişisel",
  isletme: "İşletme",
  yatirim: "Yatırım",
};

export const TIP_RENK: Record<Tip, string> = {
  kisisel: "#2563EB",
  isletme: "#16A34A",
  yatirim: "#9333EA",
};

export const TIP_EMOJI: Record<Tip, string> = {
  kisisel: "👤",
  isletme: "🏭",
  yatirim: "💹",
};
