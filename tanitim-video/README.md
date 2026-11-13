# Paraİzi tanıtım videosu (Remotion)

Dikey (1080×1920) ve 57,0 saniyelik ürün tanıtımı (seslendirme ve müzik gömülü). Sahneler `src/sahneler.tsx`, sıra ve süreler
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
- **Ses bandı:** seslendirme + özgün müzik + efektler → `public/ses.wav` (git'e girmez, yeniden üretilir).
  Metinler `ses/seslendirme.py` → `METIN`'de (okunuş için yazım: "pi-di-ef", "Para İzi").
  ```bash
  pip install numpy scipy imageio-ffmpeg edge-tts
  # .env: GEMINI_API_KEY (aistudio.google.com) ve GROQ_API_KEY (Whisper)
  python ses/toplu.py --ses Kore --model gemini-3.1-flash-tts-preview   # 2 istekte okut, cümlelere böl
  python ses/zamanla.py     # Whisper: okunuşu doğrula, sahne süreleri + işaretler → src/zaman.json
  python ses/karistir.py    # müzik sentezi + karışım → public/ses.wav
  ```
  - `toplu.py` tüm metni 2 istekte okutur (Gemini ücretsiz kota ~10 istek/gün/model). Cümle cümle üretmek için
    `seslendirme.py` (16 istek); ses örnekleri için `seslendirme.py --ornek`. Günlük kota dolunca betik net mesajla durur.
  - Anahtarsız yedek: `python ses/seslendirme.py --saglayici edge` (Microsoft sesi, daha yapay).
  - `zamanla.py` sahne sürelerini sese göre uzatır; video şu an 57,0 sn. `EN_AZ` sahnelerin en kısa süresi.
  - Sessiz video: `--props='{"ses":null}'`.
- **Instagram/WhatsApp için son adım:** Remotion tam aralık (yuvj420p) renk üretir, şununla standart hale getir:
  `ffmpeg -i out/paraizi-tanitim.mp4 -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p" -c:v libx264 -crf 19 -preset slow -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart ../docs/tanitim/paraizi-tanitim.mp4`
- **Lisans:** Remotion, bireyler ve en fazla 3 çalışanlı şirketler için ücretsizdir (remotion.dev/license).
- Sürümler sabit: `remotion@4.0.539`.
