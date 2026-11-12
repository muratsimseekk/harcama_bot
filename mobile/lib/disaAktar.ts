import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { kisaTarih } from "@/components/TarihAraligi";
import { useUyari } from "@/components/Uyari";
import { api, type DisaAktarFiltre } from "./api";
import { olay } from "./analitik";
import { degerlendirmeIste } from "./degerlendirme";
import { hataMesaji } from "./hata";
import { useMe } from "./queries";

/**
 * Seçilen aralığın (isteğe bağlı: yalnız bir kategorinin) dökümü → paylaş menüsü
 * (Drive, WhatsApp, e-posta, Dosyalar …). Excel sunucuda üretilir ve indirilir; PDF sunucudan
 * gelen yazdırılabilir HTML'den cihazda expo-print ile oluşturulur (A4, sayfalara bölünür).
 */
export type Bicim = "xlsx" | "pdf";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function dosyaAdi(bas: string, bit: string, filtre?: DisaAktarFiltre): string {
  const kat = filtre?.kategoriler?.length
    ? filtre.kategoriler
        .join("-")
        .toLocaleLowerCase("tr-TR")
        .replace(/[çğıöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h] ?? h)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)
    : "";
  return `parazi_${kat ? `${kat}_` : ""}${bas}_${bit}`;
}

export async function disaAktar(bicim: Bicim, bas: string, bit: string, filtre?: DisaAktarFiltre): Promise<void> {
  const ad = dosyaAdi(bas, bit, filtre);
  let uri: string;
  if (bicim === "xlsx") {
    const { url, headers } = await api.disaAktarIstek(bas, bit, "xlsx", filtre);
    const hedef = new File(Paths.cache, `${ad}.xlsx`);
    const dosya = await File.downloadFileAsync(url, hedef, { headers, idempotent: true });
    uri = dosya.uri;
  } else {
    const html = await api.disaAktarHtml(bas, bit, filtre);
    const pdf = await Print.printToFileAsync({ html });
    // Paylaşımda anlamlı ad görünsün (expo-print rastgele ad verir)
    const hedef = new File(Paths.cache, `${ad}.pdf`);
    if (hedef.exists) hedef.delete();
    new File(pdf.uri).move(hedef);
    uri = hedef.uri;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Bu cihazda paylaşım kullanılamıyor");
  await Sharing.shareAsync(uri, {
    mimeType: bicim === "xlsx" ? XLSX_MIME : "application/pdf",
    UTI: bicim === "xlsx" ? "org.openxmlformats.spreadsheetml.sheet" : "com.adobe.pdf",
    dialogTitle: bicim === "xlsx" ? "Excel dökümünü paylaş" : "PDF dökümünü paylaş",
  });
}

/**
 * "Dışa aktar" akışı: Pro kontrolü → biçim seçimi → indir/paylaş. `araligiDegistir` verilirse
 * pencerede "Tarih aralığını değiştir" de çıkar (Analiz'de Özel sekmesine geçirir).
 */
export function useDisaAktar(ekran: string) {
  const uyari = useUyari();
  const router = useRouter();
  const me = useMe();
  const [aktariliyor, setAktariliyor] = useState(false);

  async function aktar(bicim: Bicim, bas: string, bit: string, filtre?: DisaAktarFiltre) {
    setAktariliyor(true);
    try {
      await disaAktar(bicim, bas, bit, filtre);
      olay("export_completed", { bicim, kategori: !!filtre, ekran });
      // Olumlu an: döküm paylaşım penceresi kapandıktan sonra
      setTimeout(() => degerlendirmeIste("disa_aktar"), 1200);
    } catch (e) {
      uyari("Dışa aktarılamadı", hataMesaji(e, undefined, { ekran }));
    } finally {
      setAktariliyor(false);
    }
  }

  function sor(
    bas: string | undefined,
    bit: string | undefined,
    secenek: { filtre?: DisaAktarFiltre; baslik?: string; araligiDegistir?: () => void } = {},
  ) {
    if (!bas || !bit) return;
    if (me.data?.plan !== "pro") {
      // Ara uyarı yok: Pro ekranı bu bağlamda "Excel ve PDF dökümü Pro'da" başlığıyla açılır
      router.push({ pathname: "/uyelik", params: { neden: "disa-aktar" } });
      return;
    }
    const kapsam = secenek.baslik ?? "Tüm kayıtlar";
    uyari(
      "Dışa aktar",
      `${kapsam}\n${kisaTarih(bas)} – ${kisaTarih(bit)}`,
      [
        { yazi: "Excel (.xlsx)", onPress: () => aktar("xlsx", bas, bit, secenek.filtre) },
        { yazi: "PDF", onPress: () => aktar("pdf", bas, bit, secenek.filtre) },
        ...(secenek.araligiDegistir ? [{ yazi: "Tarih aralığını değiştir", onPress: secenek.araligiDegistir }] : []),
        { yazi: "Vazgeç", stil: "vazgec" as const },
      ],
      { ikon: "download-outline" },
    );
  }

  return { aktariliyor, sor };
}
