import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  AltMetin,
  Arkaplan,
  Baslik,
  Cubuk,
  Giris,
  Ikon,
  IkonKutu,
  Kart,
  OrtaTelefon,
  R,
  Rozet,
  SANS,
  SERIF,
  Simge,
  tl,
  useAra,
  useYay,
} from "./tema";

const yazi = (boyut: number, agirlik = 700, renk = R.yazi) => ({
  fontFamily: SANS,
  fontWeight: agirlik,
  fontSize: boyut,
  color: renk,
});

// ================================================================== 1. Kanca
const UCAN = [
  { t: "−850 ₺", x: 70, y: 1500, h: 1.5, g: 0 },
  { t: "−1.200 ₺", x: 760, y: 1620, h: 1.9, g: 8 },
  { t: "−349 ₺", x: 110, y: 1760, h: 1.7, g: 16 },
  { t: "−2.290 ₺", x: 740, y: 1380, h: 1.3, g: 22 },
  { t: "−95 ₺", x: 820, y: 1820, h: 1.6, g: 30 },
  { t: "−18.000 ₺", x: 60, y: 1300, h: 1.2, g: 36 },
];

export const Kanca: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      {UCAN.map((u, i) => {
        const yerel = f - u.g;
        const o = interpolate(yerel, [0, 10, 50, 70], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: u.x,
              top: u.y - Math.max(0, yerel) * u.h * 3.2,
              opacity: o,
              transform: `rotate(${(i % 2 ? 1 : -1) * 6}deg)`,
              ...yazi(40, 800, R.kirmizi),
              background: R.beyaz,
              padding: "14px 26px",
              borderRadius: 999,
              boxShadow: "0 12px 30px rgba(40,20,10,0.12)",
            }}
          >
            {u.t}
          </div>
        );
      })}
      <Baslik satirlar={["Maaş yattı…"]} boyut={118} top={560} gecikme={4} />
      <Baslik satirlar={["ve yine bitti?"]} vurgu={["bitti"]} boyut={118} top={700} gecikme={22} />
      <AltMetin top={900} gecikme={40} boyut={44}>
        Peki nereye gitti?
      </AltMetin>
    </AbsoluteFill>
  );
};

// ================================================================== 2. Marka
export const Marka: React.FC = () => {
  const s = useYay(2, { damping: 11 });
  const f = useCurrentFrame();
  const ad = "Paraİzi";
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -14}deg)` }}>
          <Simge boyut={260} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 870, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {ad.split("").map((h, i) => {
          const o = interpolate(f - 12 - i * 2, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span
              key={i}
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: 150,
                color: R.beyaz,
                opacity: o,
                display: "inline-block",
                transform: `translateY(${(1 - o) * 30}px)`,
              }}
            >
              {h}
            </span>
          );
        })}
      </div>
      <AltMetin top={1080} gecikme={26} renk={R.seftaliAcik} boyut={48}>
        Sesli harcama takibi
      </AltMetin>
    </AbsoluteFill>
  );
};

// ================================================================== 3. Sesle kayıt
const CUMLE = "“Market 850, dün benzin 1200”";

export const Ses: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.round(CUMLE.length * interpolate(f, [32, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const dinliyor = f > 14 && f < 92;
  // mikrofon düğmesi: telefon top 600, genişlik 600 → ekran ölçeği 600/1080
  const my = 600 + 20 + (990 * 600) / 1080;
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <Baslik satirlar={["Söyle,", "kaydetsin."]} renk={R.beyaz} gecikme={4} />
      <AltMetin top={485} renk={R.seftaliAcik} gecikme={16} boyut={36}>
        Tutar, kategori ve tarih saniyeler içinde hazır.
      </AltMetin>
      <OrtaTelefon ekran="kayit" top={600} />
      {dinliyor &&
        [0, 1].map((k) => {
          const p = (((f - 14) / 30 + k * 0.5) % 1 + 1) % 1;
          const r = 70 + 170 * p;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 540 - r,
                top: my - r - f * 0.25,
                width: 2 * r,
                height: 2 * r,
                borderRadius: "50%",
                border: `8px solid rgba(224,106,74,${0.7 * (1 - p)})`,
              }}
            />
          );
        })}
      <Giris gecikme={22} style={{ position: "absolute", top: 790, left: 110, width: 860 }}>
        <Kart style={{ padding: "26px 32px", display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              background: "#FDECE5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ikon ad="mic" boyut={44} renk={R.turuncu} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={yazi(26, 600, R.soluk)}>Söylediğin</div>
            <div style={{ ...yazi(33, 700), minHeight: 42 }}>
              {CUMLE.slice(0, n)}
              {f < 92 && Math.floor(f / 8) % 2 === 0 && (
                <span style={{ display: "inline-block", width: 3, height: 34, background: R.turuncu, marginLeft: 3 }} />
              )}
            </div>
          </div>
          {dinliyor && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", height: 60 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    borderRadius: 4,
                    background: R.turuncu,
                    height: 14 + Math.abs(Math.sin(f / 3 + i * 1.3)) * 40,
                  }}
                />
              ))}
            </div>
          )}
        </Kart>
      </Giris>
      <Giris gecikme={96} kay={80} olcek0={0.8} style={{ position: "absolute", top: 1250, left: 130, width: 820 }}>
        <Kart style={{ padding: "30px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={yazi(32, 700)}>2 kayıt bulundu</span>
            <Ikon ad="checkmark-circle" boyut={44} renk={R.yesil} />
          </div>
          {[
            { ik: "cart", renk: "#E85D8C", ad: "Market", alt: "Market · bugün", tutar: "850 ₺" },
            { ik: "car", renk: "#506EAA", ad: "Benzin", alt: "Ulaşım · dün", tutar: "1.200 ₺" },
          ].map((r, i) => (
            <Giris key={i} gecikme={104 + i * 7} kay={20} olcek0={1}>
              <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "12px 0" }}>
                <IkonKutu ad={r.ik} renk={r.renk} />
                <div style={{ flex: 1 }}>
                  <div style={yazi(33, 700)}>{r.ad}</div>
                  <div style={yazi(26, 500, R.soluk)}>{r.alt}</div>
                </div>
                <div style={yazi(34, 700)}>{r.tutar}</div>
              </div>
            </Giris>
          ))}
        </Kart>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 4. Yapay zeka kategori
const ESLESME = [
  { soz: "“kahve 90”", ik: "cafe", renk: "#5A4FCF", kat: "Kafe/Restoran", tur: null },
  { soz: "“benzin 600”", ik: "car", renk: "#506EAA", kat: "Ulaşım", tur: null },
  { soz: "“maaş geldi 45.000”", ik: "wallet", renk: R.yesil, kat: "Maaş", tur: "Gelir" },
  { soz: "“altın aldım 3.000”", ik: "diamond", renk: "#D94F8A", kat: "Altın/Döviz", tur: "Yatırım" },
];

export const YapayZeka: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      <Baslik satirlar={["Kategoriyi", "yapay zeka bulur."]} vurgu={["yapay", "zeka"]} gecikme={4} />
      <AltMetin top={485} gecikme={16} boyut={36}>
        Ne dediğini anlar; sen sadece onayla.
      </AltMetin>
      <OrtaTelefon ekran="onay" top={600} />
      {ESLESME.map((e, i) => {
        const g = 24 + i * 16;
        const katG = g + 12;
        const ks = interpolate(f - katG, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Giris key={i} gecikme={g} kayX={i % 2 ? 160 : -160} kay={0} olcek0={0.96} style={{ position: "absolute", top: 1020 + i * 142, left: 70, width: 940 }}>
            <Kart style={{ padding: "22px 28px", display: "flex", alignItems: "center", gap: 18, borderRadius: 30 }}>
              <div style={{ ...yazi(31, 700), flex: 1, whiteSpace: "nowrap" }}>{e.soz}</div>
              <Ikon ad="sparkles" boyut={34} renk={R.turuncu} style={{ opacity: ks, transform: `rotate(${(1 - ks) * 90}deg)` }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 20px",
                  borderRadius: 999,
                  background: `color-mix(in srgb, ${e.renk} 14%, white)`,
                  opacity: ks,
                  transform: `scale(${0.7 + 0.3 * ks})`,
                }}
              >
                <Ikon ad={e.ik} boyut={30} renk={e.renk} />
                <span style={yazi(28, 700, e.renk)}>{e.kat}</span>
                {e.tur && <span style={{ ...yazi(22, 700, R.soluk), marginLeft: 4 }}>· {e.tur}</span>}
              </div>
            </Kart>
          </Giris>
        );
      })}
    </AbsoluteFill>
  );
};

// ================================================================== 5. Gelir & gider
export const GelirGider: React.FC = () => {
  const p = useAra(18, 60);
  const e = 1 - (1 - p) ** 3;
  const gelir = 65000 * e;
  const gider = 33965 * e;
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <Baslik satirlar={["Gelir, gider,", "hepsi tek yerde."]} renk={R.beyaz} gecikme={4} />
      <Giris gecikme={12} kay={80} style={{ position: "absolute", top: 560, left: 90, width: 900 }}>
        <Kart style={{ padding: "40px 44px" }}>
          <div style={yazi(28, 600, R.soluk)}>Kasım · bu ay</div>
          {[
            { ad: "Gelir", ik: "arrow-down-circle", renk: R.yesil, v: gelir, isaret: true },
            { ad: "Gider", ik: "arrow-up-circle", renk: R.kirmizi, v: -gider, isaret: false },
          ].map((r) => (
            <div key={r.ad} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26 }}>
              <Ikon ad={r.ik} boyut={48} renk={r.renk} />
              <span style={{ ...yazi(36, 600), flex: 1 }}>{r.ad}</span>
              <span style={yazi(44, 800, r.renk)}>{tl(r.v, r.isaret)}</span>
            </div>
          ))}
          <div style={{ marginTop: 30, display: "flex", height: 26, borderRadius: 13, overflow: "hidden", background: "#EFE9E3" }}>
            <div style={{ width: `${52.3 * e}%`, background: R.kirmizi }} />
            <div style={{ width: `${47.7 * e}%`, background: R.yesil }} />
          </div>
          <div style={{ height: 1, background: "#EEE7E0", margin: "32px 0 24px" }} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={yazi(34, 600, R.soluk)}>Kalan</span>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 84, color: R.turuncu }}>{tl(gelir - gider)}</span>
          </div>
        </Kart>
      </Giris>
      <AltMetin top={1250} renk={R.beyaz} gecikme={52} boyut={38}>
        Her kaydı ayrı tut:
      </AltMetin>
      <div style={{ position: "absolute", top: 1330, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20 }}>
        {[
          { ad: "Kişisel", ik: "person" },
          { ad: "İşletme", ik: "briefcase" },
          { ad: "Yatırım", ik: "trending-up" },
        ].map((t, i) => (
          <Giris key={t.ad} gecikme={60 + i * 6} kay={30} olcek0={0.7}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: R.beyaz,
                borderRadius: 999,
                padding: "22px 32px",
                boxShadow: "0 16px 34px rgba(40,20,10,0.18)",
              }}
            >
              <Ikon ad={t.ik} boyut={36} renk={R.turuncu} />
              <span style={yazi(34, 700)}>{t.ad}</span>
            </div>
          </Giris>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ================================================================== 6. Kategoriler
const KATEGORI = [
  { ad: "Kira", ik: "home", renk: "#3D7FD9", tutar: 15000, oran: 0.52 },
  { ad: "Malzeme/Stok", ik: "cube", renk: "#E8743B", tutar: 4200, oran: 0.15 },
  { ad: "Giyim", ik: "shirt", renk: "#27A57A", tutar: 2499, oran: 0.09 },
  { ad: "Market", ik: "cart", renk: "#E8A93B", tutar: 2255, oran: 0.08 },
];

export const Kategoriler: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      <Baslik satirlar={["Paran nereye", "gidiyor?"]} vurgu={["gidiyor"]} gecikme={4} />
      <AltMetin top={485} gecikme={16} boyut={36}>
        Kategoriler, oranlar, günlük ortalama — tek bakışta.
      </AltMetin>
      <OrtaTelefon ekran="home" top={600} />
      <Giris gecikme={30} kay={90} style={{ position: "absolute", top: 1130, left: 90, width: 900 }}>
        <Kart style={{ padding: "30px 40px 18px" }}>
          {KATEGORI.map((k, i) => {
            const p = interpolate(f - 38 - i * 6, [0, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const e = 1 - (1 - p) ** 3;
            return (
              <div key={k.ad} style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 18 }}>
                <IkonKutu ad={k.ik} renk={k.renk} boyut={68} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={yazi(31, 700)}>{k.ad}</span>
                    <span style={yazi(31, 700)}>
                      <span style={{ ...yazi(26, 600, R.soluk), marginRight: 16 }}>%{Math.round(k.oran * 100 * e)}</span>
                      {tl(k.tutar * e)}
                    </span>
                  </div>
                  <Cubuk oran={(k.oran / 0.52) * e} renk={k.renk} yukseklik={12} />
                </div>
              </div>
            );
          })}
        </Kart>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 7. Limit
export const Limit: React.FC = () => {
  const p = useAra(26, 70);
  const e = 1 - (1 - p) ** 3;
  const oran = 0.89 * e;
  const renk = oran > 0.8 ? "#D9822B" : R.yesil;
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <Baslik satirlar={["Limit koy,", "aşmadan haber al."]} renk={R.beyaz} gecikme={4} />
      <OrtaTelefon ekran="hedef2" top={560} />
      <Giris gecikme={16} kay={80} style={{ position: "absolute", top: 940, left: 90, width: 900 }}>
        <Kart style={{ padding: "32px 38px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <IkonKutu ad="cart" renk="#E85D8C" />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={yazi(36, 700)}>Market</span>
                <Rozet boyut={20}>LİMİT</Rozet>
              </div>
              <div style={{ ...yazi(28, 600, R.soluk), marginTop: 6 }}>
                {tl(8000 * oran)} / 8.000 ₺ · {tl(8000 - 8000 * oran)} kaldı
              </div>
            </div>
            <span style={yazi(44, 800, renk)}>%{Math.round(oran * 100)}</span>
          </div>
          <div style={{ marginTop: 22 }}>
            <Cubuk oran={oran} renk={renk} yukseklik={18} />
          </div>
        </Kart>
      </Giris>
      <Giris gecikme={72} kayX={700} kay={0} olcek0={1} style={{ position: "absolute", top: 1240, left: 60, width: 960 }}>
        <Kart style={{ padding: "26px 30px", display: "flex", gap: 24, alignItems: "flex-start", borderRadius: 32 }}>
          <Simge boyut={72} />
          <div style={{ flex: 1 }}>
            <div style={yazi(24, 600, R.soluk)}>Paraİzi · şimdi</div>
            <div style={{ ...yazi(32, 700), marginTop: 4 }}>Toplam limitinin %97'si doldu</div>
            <div style={{ ...yazi(27, 500, R.soluk), marginTop: 4 }}>970 ₺ kaldı. Ay sonuna 10 gün var.</div>
          </div>
        </Kart>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 8. Hedef & yatırım
const ALT_HEDEF = [
  { ad: "Hisse Senedi", ik: "trending-up", renk: "#6B5BD2", v: 2500, h: 3000 },
  { ad: "Kripto Para", ik: "logo-bitcoin", renk: "#E8743B", v: 1200, h: 2000 },
  { ad: "Altın/Döviz", ik: "diamond", renk: "#D94F8A", v: 3000, h: 5000 },
];

export const Hedef: React.FC = () => {
  const f = useCurrentFrame();
  const p = useAra(20, 70);
  const e = 1 - (1 - p) ** 3;
  const oran = (6700 / 15000) * e;
  const r = 78;
  const cevre = 2 * Math.PI * r;
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      <Baslik satirlar={["Birikimin", "hedefe bağlı."]} vurgu={["hedefe"]} gecikme={4} />
      <AltMetin top={485} gecikme={16} boyut={36}>
        Hisse, altın, kripto… her yatırıma ayrı hedef.
      </AltMetin>
      <OrtaTelefon ekran="hedef1" top={600} />
      <Giris gecikme={14} kay={80} style={{ position: "absolute", top: 960, left: 90, width: 900 }}>
        <Kart style={{ padding: "30px 38px", display: "flex", alignItems: "center", gap: 34, background: R.turuncu }}>
          <svg width={2 * r + 24} height={2 * r + 24}>
            <circle cx={r + 12} cy={r + 12} r={r} stroke="rgba(255,255,255,0.3)" strokeWidth={16} fill="none" />
            <circle
              cx={r + 12}
              cy={r + 12}
              r={r}
              stroke={R.beyaz}
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${cevre * oran} ${cevre}`}
              transform={`rotate(-90 ${r + 12} ${r + 12})`}
            />
            <text x={r + 12} y={r + 24} textAnchor="middle" style={{ ...yazi(38, 800, R.beyaz) }} fill={R.beyaz}>
              %{Math.round(oran * 100)}
            </text>
          </svg>
          <div>
            <div style={yazi(28, 600, R.seftaliAcik)}>Aylık yatırım hedefi</div>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, color: R.beyaz, lineHeight: 1.1 }}>15.000 ₺</div>
            <div style={yazi(28, 600, R.seftaliAcik)}>Bu ay biriken: {tl(6700 * e)}</div>
          </div>
        </Kart>
      </Giris>
      <Giris gecikme={34} kay={80} style={{ position: "absolute", top: 1250, left: 90, width: 900 }}>
        <Kart style={{ padding: "26px 38px 10px" }}>
          {ALT_HEDEF.map((h, i) => {
            const q = interpolate(f - 42 - i * 6, [0, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const qe = 1 - (1 - q) ** 3;
            return (
              <div key={h.ad} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
                <IkonKutu ad={h.ik} renk={h.renk} boyut={62} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={yazi(29, 700)}>{h.ad}</span>
                    <span style={yazi(27, 700, R.soluk)}>
                      {tl(h.v * qe)} / {tl(h.h)}
                    </span>
                  </div>
                  <Cubuk oran={(h.v / h.h) * qe} renk={h.renk} yukseklik={12} />
                </div>
              </div>
            );
          })}
        </Kart>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 9. Sabit gider/gelir
const TEKRAR = [
  { ad: "Maaş", ik: "wallet", renk: R.yesil, gun: "Her ayın 1. günü", tutar: 65000 },
  { ad: "Kira", ik: "home", renk: "#3D7FD9", gun: "Her ayın 3. günü", tutar: -18000 },
  { ad: "Elektrik ve doğalgaz", ik: "flash", renk: "#E8A93B", gun: "Her ayın 9. günü", tutar: -2290 },
];

export const Sabit: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <Baslik satirlar={["Kira, fatura, maaş:", "kendiliğinden."]} renk={R.beyaz} boyut={88} gecikme={4} />
      <AltMetin top={485} renk={R.seftaliAcik} gecikme={16} boyut={36}>
        Bir kez gir, her ay o gün otomatik eklensin.
      </AltMetin>
      <OrtaTelefon ekran="tekrar" top={600} />
      {TEKRAR.map((t, i) => {
        const g = 22 + i * 12;
        const ac = interpolate(f - g - 22, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Giris key={t.ad} gecikme={g} kayX={-200} kay={0} olcek0={0.96} style={{ position: "absolute", top: 1000 + i * 168, left: 70, width: 940 }}>
            <Kart style={{ padding: "26px 30px", display: "flex", alignItems: "center", gap: 22, borderRadius: 32 }}>
              <IkonKutu ad={t.ik} renk={t.renk} />
              <div style={{ flex: 1 }}>
                <div style={yazi(32, 700)}>{t.ad}</div>
                <div style={yazi(25, 500, R.soluk)}>{t.gun}</div>
              </div>
              <span style={yazi(34, 800, t.tutar > 0 ? R.yesil : R.yazi)}>{tl(t.tutar, true)}</span>
              <div
                style={{
                  width: 72,
                  height: 42,
                  borderRadius: 21,
                  background: `color-mix(in srgb, ${R.turuncu} ${Math.round(ac * 100)}%, #D8D2CB)`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4 + ac * 30,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: R.beyaz,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </Kart>
          </Giris>
        );
      })}
      <Giris gecikme={80} kay={30} olcek0={0.7} style={{ position: "absolute", top: 1520, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: R.yazi, borderRadius: 999, padding: "18px 30px" }}>
          <Ikon ad="repeat" boyut={34} renk={R.seftaliAcik} />
          <span style={yazi(30, 700, R.beyaz)}>Aylık sabit gelir ve gider hesaplanır</span>
        </div>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 10. Excel / PDF
const Dosya: React.FC<{ ad: string; renk: string; etiket: string }> = ({ ad, renk, etiket }) => (
  <div style={{ width: 300, height: 380, background: R.beyaz, borderRadius: 26, boxShadow: "0 30px 60px rgba(40,20,10,0.25)", overflow: "hidden" }}>
    <div style={{ background: renk, padding: "22px 26px", ...yazi(40, 800, R.beyaz) }}>{etiket}</div>
    <div style={{ padding: "22px 26px" }}>
      {[0.9, 0.7, 0.8, 0.55, 0.75, 0.6].map((w, i) => (
        <div key={i} style={{ height: 14, width: `${w * 100}%`, background: "#EEE7E0", borderRadius: 7, marginBottom: 18 }} />
      ))}
      <div style={{ ...yazi(22, 600, R.soluk), marginTop: 6 }}>{ad}</div>
    </div>
  </div>
);

export const DisaAktar: React.FC = () => {
  const f = useCurrentFrame();
  const sec = interpolate(f, [44, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s1 = useYay(56, { damping: 12 });
  const s2 = useYay(64, { damping: 12 });
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      <Baslik satirlar={["Excel ve PDF,", "tek dokunuşla."]} vurgu={["tek"]} gecikme={4} />
      <AltMetin top={485} gecikme={16} boyut={36}>
        Tarih aralığını seç, dökümün hazır. <Rozet boyut={22}>PRO</Rozet>
      </AltMetin>
      <Giris gecikme={14} kay={80} style={{ position: "absolute", top: 620, left: 130, width: 820 }}>
        <Kart style={{ padding: "40px 44px" }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 56, color: R.yazi }}>Dışa aktar</div>
          <div style={{ ...yazi(28, 500, R.soluk), marginBottom: 26 }}>Tüm kayıtlar · 1 – 30 Kasım</div>
          {[
            { ik: "grid-outline", ad: "Excel (.xlsx)", alt: "Tabloda düzenle" },
            { ik: "document-text-outline", ad: "PDF", alt: "Yazdır, paylaş" },
          ].map((o, i) => (
            <div
              key={o.ad}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "22px 26px",
                borderRadius: 26,
                marginTop: 16,
                background: i === 0 ? `color-mix(in srgb, ${R.turuncu} ${Math.round(14 + sec * 12)}%, white)` : "#FAF0EA",
                transform: i === 0 ? `scale(${1 - 0.03 * Math.sin(sec * Math.PI)})` : undefined,
              }}
            >
              <Ikon ad={o.ik} boyut={44} renk={R.turuncu} />
              <div>
                <div style={yazi(34, 700)}>{o.ad}</div>
                <div style={yazi(25, 500, R.soluk)}>{o.alt}</div>
              </div>
            </div>
          ))}
        </Kart>
      </Giris>
      <div
        style={{
          position: "absolute",
          top: 1180 + (1 - s1) * 200,
          left: 170,
          opacity: Math.min(1, s1 * 1.5),
          transform: `rotate(${-8 * s1}deg) scale(${0.6 + 0.4 * s1})`,
        }}
      >
        <Dosya ad="Kasim-2026.xlsx" renk="#1F8A4C" etiket="XLSX" />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1160 + (1 - s2) * 200,
          left: 610,
          opacity: Math.min(1, s2 * 1.5),
          transform: `rotate(${7 * s2}deg) scale(${0.6 + 0.4 * s2})`,
        }}
      >
        <Dosya ad="Kasim-2026.pdf" renk="#D0453B" etiket="PDF" />
      </div>
    </AbsoluteFill>
  );
};

// ================================================================== 11. Hane
const UYELER = [
  { ad: "Ayşe", harf: "A", renk: "#E8743B", rol: "Kurucu" },
  { ad: "Mehmet", harf: "M", renk: "#3D7FD9", rol: "Düzenleyici" },
  { ad: "Zeynep", harf: "Z", renk: "#27A57A", rol: "Görüntüleyici" },
];

export const Hane: React.FC = () => {
  const p = useAra(70, 100);
  const e = 1 - (1 - p) ** 3;
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <Baslik satirlar={["Evin bütçesi,", "birlikte."]} renk={R.beyaz} gecikme={4} />
      <AltMetin top={485} renk={R.seftaliAcik} gecikme={16} boyut={36}>
        Haneni kur, kodla davet et, ortak görün. <Rozet boyut={22} zemin={R.beyaz}>PRO</Rozet>
      </AltMetin>
      <Giris gecikme={12} kay={80} style={{ position: "absolute", top: 600, left: 90, width: 900 }}>
        <Kart style={{ padding: "36px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <IkonKutu ad="people" renk={R.turuncu} boyut={84} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 54, color: R.yazi }}>Ev</div>
              <div style={yazi(27, 500, R.soluk)}>3 kişi · ortak görünüm</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#FAF0EA",
              borderRadius: 24,
              padding: "20px 26px",
            }}
          >
            <div>
              <div style={yazi(22, 600, R.soluk)}>Katılım kodu</div>
              <div style={{ ...yazi(40, 800), letterSpacing: 6 }}>PRZ4821</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ikon ad="copy-outline" boyut={30} renk={R.turuncu} />
              <span style={yazi(28, 700, R.turuncu)}>Kopyala</span>
            </div>
          </div>
          <div style={{ ...yazi(22, 700, R.soluk), letterSpacing: 2, margin: "28px 0 8px" }}>ÜYELER</div>
          {UYELER.map((u, i) => (
            <Giris key={u.ad} gecikme={30 + i * 9} kayX={120} kay={0} olcek0={1}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0" }}>
                <div
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    background: u.renk,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...yazi(30, 800, R.beyaz),
                  }}
                >
                  {u.harf}
                </div>
                <span style={{ ...yazi(32, 700), flex: 1 }}>{u.ad}</span>
                <Rozet boyut={20} renk={R.soluk} zemin="#F1ECE6">
                  {u.rol}
                </Rozet>
              </div>
            </Giris>
          ))}
        </Kart>
      </Giris>
      <Giris gecikme={64} kay={60} style={{ position: "absolute", top: 1330, left: 90, width: 900 }}>
        <Kart style={{ padding: "28px 40px", background: R.yazi }}>
          <div style={yazi(26, 600, "#BDB6AD")}>Evin bu ayki toplam harcaması</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 76, color: R.beyaz }}>{tl(24350 * e)}</span>
            <div style={{ display: "flex" }}>
              {UYELER.map((u, i) => (
                <div
                  key={u.ad}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 27,
                    background: u.renk,
                    border: `4px solid ${R.yazi}`,
                    marginLeft: i ? -14 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...yazi(24, 800, R.beyaz),
                  }}
                >
                  {u.harf}
                </div>
              ))}
            </div>
          </div>
        </Kart>
      </Giris>
    </AbsoluteFill>
  );
};

// ================================================================== 12. Güven
const GUVEN = [
  { ik: "card-outline", t: "Kart ya da banka bilgisi istemez" },
  { ik: "mic-off-outline", t: "Sesli kayıtların saklanmaz" },
  { ik: "trash-outline", t: "Hesabını tek dokunuşla silebilirsin" },
];

export const Guven: React.FC = () => {
  const s = useYay(2, { damping: 11 });
  return (
    <AbsoluteFill>
      <Arkaplan tur="krem" />
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 230,
            height: 230,
            borderRadius: 115,
            background: R.turuncu,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${s})`,
            boxShadow: "0 30px 60px rgba(224,106,74,0.35)",
          }}
        >
          <Ikon ad="shield-checkmark" boyut={130} renk={R.beyaz} />
        </div>
      </div>
      <Baslik satirlar={["Bankana bağlanmaz.", "Verin sende kalır."]} vurgu={["sende"]} boyut={88} gecikme={10} top={640} />
      {GUVEN.map((g, i) => (
        <Giris key={g.t} gecikme={30 + i * 9} kay={40} style={{ position: "absolute", top: 940 + i * 160, left: 90, width: 900 }}>
          <Kart style={{ padding: "28px 34px", display: "flex", alignItems: "center", gap: 26, borderRadius: 32 }}>
            <IkonKutu ad={g.ik} renk={R.turuncu} boyut={80} />
            <span style={yazi(34, 600)}>{g.t}</span>
          </Kart>
        </Giris>
      ))}
    </AbsoluteFill>
  );
};

// ================================================================== 13. Kapanış
export const Kapanis: React.FC = () => {
  const f = useCurrentFrame();
  const s = useYay(2, { damping: 11 });
  const c = useYay(40, { damping: 12 });
  const nabiz = f > 60 ? 1 + 0.03 * Math.sin(((f - 60) / 30) * 2 * Math.PI * 1.2) : 1;
  return (
    <AbsoluteFill>
      <Arkaplan tur="turuncu" />
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${s})` }}>
          <Simge boyut={230} />
        </div>
      </div>
      <Baslik satirlar={["Paraİzi"]} renk={R.beyaz} boyut={140} gecikme={8} top={600} />
      <Baslik satirlar={["Söyle. Kaydet. Gör."]} renk={R.seftaliAcik} boyut={64} gecikme={18} top={790} />
      <div style={{ position: "absolute", top: 950, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {["Günde 3 kayıt ücretsiz", "Pro ile sınırsız"].map((t, i) => (
          <Giris key={t} gecikme={28 + i * 6} kay={20} olcek0={0.8}>
            <div style={{ ...yazi(30, 700, R.beyaz), border: "3px solid rgba(255,255,255,0.6)", borderRadius: 999, padding: "16px 28px" }}>{t}</div>
          </Giris>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1130,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, c * 1.4),
          transform: `translateY(${(1 - c) * 40}px) scale(${(0.85 + 0.15 * c) * nabiz})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            background: R.beyaz,
            borderRadius: 999,
            padding: "34px 64px",
            boxShadow: "0 30px 60px rgba(60,20,10,0.3)",
          }}
        >
          <Ikon ad="logo-google-playstore" boyut={56} renk={R.turuncu} />
          <span style={yazi(46, 800)}>Google Play'de ücretsiz</span>
        </div>
      </div>
      <AltMetin top={1330} renk={R.seftaliAcik} gecikme={52} boyut={34}>
        Play Store'da “Paraİzi” diye ara
      </AltMetin>
    </AbsoluteFill>
  );
};
