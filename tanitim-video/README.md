# Paraİzi tanıtım videosu (Remotion)

Dikey (1080×1920) ve 46,5 saniyelik ürün tanıtımı. Sahneler `src/sahneler.tsx`, sıra ve süreler
`src/Tanitim.tsx` → `SAHNELER`, renk, font ve ortak parçalar `src/tema.tsx`'te.
Metinler, seslendirme ve paylaşım yazıları: `docs/tanitim/VIDEO-METNI.md`.

```bash
cd tanitim-video
npm install
npm run studio          # tarayıcıda önizle ve düzenle (canlı)
npm run render          # → out/paraizi-tanitim.mp4
npx remotion still src/index.ts Tanitim out/kare.png --frame=300   # tek kare
```

- **Ekran görüntüleri** `public/ekran/` altında. Mağaza görsellerinin ham ekranları kullanılıyor (`docs/magaza-gorselleri/ham`),
  durum çubuğu temizlenmiş halde (`scripts/magaza_ekran_goruntuleri.py` → `ham()`).
- **Fontlar** uygulamanın kendi fontları: Newsreader, Inter ve Ionicons simgeleri.
- **Müzik ya da seslendirme eklemek için** dosyayı `public/` altına koy ve şöyle çalıştır:
  `npx remotion render src/index.ts Tanitim out/paraizi-tanitim.mp4 --props='{"muzik":"muzik.mp3"}'`
  (Ses 0,5 sn'de yükselir. Seslendirme ve müzik birlikte olacaksa önce ikisini tek dosyada birleştir.)
- **Lisans:** Remotion, bireyler ve en fazla 3 çalışanlı şirketler için ücretsizdir (remotion.dev/license).
- Sürümler sabit: `remotion@4.0.539`.
