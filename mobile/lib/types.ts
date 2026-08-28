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
}

export const TIP_ETIKET: Record<Tip, string> = {
  kisisel: "Kişisel",
  isletme: "İşletme",
  yatirim: "Yatırım",
};

export const TIP_EMOJI: Record<Tip, string> = {
  kisisel: "👤",
  isletme: "🏭",
  yatirim: "💹",
};
