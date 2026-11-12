import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { api } from "./api";

/**
 * Seçilen aralığın dökümü → paylaş menüsü (Drive, WhatsApp, e-posta, Dosyalar …).
 * Excel sunucuda üretilir ve indirilir; PDF sunucudan gelen yazdırılabilir HTML'den cihazda
 * expo-print ile oluşturulur (A4, sayfalara bölünür).
 */
export type Bicim = "xlsx" | "pdf";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function disaAktar(bicim: Bicim, bas: string, bit: string): Promise<void> {
  const ad = `parazi_${bas}_${bit}`;
  let uri: string;
  if (bicim === "xlsx") {
    const { url, headers } = await api.disaAktarIstek(bas, bit, "xlsx");
    const hedef = new File(Paths.cache, `${ad}.xlsx`);
    const dosya = await File.downloadFileAsync(url, hedef, { headers, idempotent: true });
    uri = dosya.uri;
  } else {
    const html = await api.disaAktarHtml(bas, bit);
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
