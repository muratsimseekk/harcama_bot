# Paraİzi tanıtım videosu (Remotion)

Dikey (1080×1920) ve 52,6 saniyelik ürün tanıtımı (seslendirme ve müzik gömülü). Sahneler `src/sahneler.tsx`, sıra ve süreler
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
- **Ses bandı:** Seslendirme, özgün müzik ve efektler `public/ses.wav`'a karıştırılır (git'e girmez, yeniden üretilir):
  ```bash
  pip install edge-tts numpy scipy imageio-ffmpeg
  python ses/seslendirme.py            # cümleler → ses/parcalar/NN.mp3 (--ses tr-TR-AhmetNeural = erkek ses)
  python ses/karistir.py               # müzik sentezi + karışım → public/ses.wav (-14 LUFS)
  ```
  Sahne süreleri `src/zaman.json`'da; hem video hem karışım buradan okunur. Bir cümle uzarsa ilgili sahnenin
  süresini burada artır. Sessiz video: `--props='{"ses":null}'`.
- **Instagram/WhatsApp için son adım:** Remotion tam aralık (yuvj420p) renk üretir, şununla standart hale getir:
  `ffmpeg -i out/paraizi-tanitim.mp4 -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p" -c:v libx264 -crf 19 -preset slow -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart ../docs/tanitim/paraizi-tanitim.mp4`
- **Lisans:** Remotion, bireyler ve en fazla 3 çalışanlı şirketler için ücretsizdir (remotion.dev/license).
- Sürümler sabit: `remotion@4.0.539`.
