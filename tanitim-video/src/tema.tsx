import { loadFont } from "@remotion/fonts";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import glif from "./ionicons.json";

// ------------------------------------------------------------------ renkler / fontlar
export const R = {
  turuncu: "#E06A4A",
  turuncuKoyu: "#C45438",
  krem: "#FAF9F5",
  seftali: "#F6E6DC",
  seftaliAcik: "#FFE4D8",
  yazi: "#1F1E1D",
  soluk: "#6B675F",
  beyaz: "#FFFFFF",
  yesil: "#2E9E5B",
  kirmizi: "#D9534F",
};
export const SERIF = "Newsreader";
export const SANS = "Inter";

const fontlar: [string, string, string][] = [
  [SERIF, "Newsreader_700Bold.ttf", "700"],
  [SERIF, "Newsreader_600SemiBold.ttf", "600"],
  [SANS, "Inter_500Medium.ttf", "500"],
  [SANS, "Inter_600SemiBold.ttf", "600"],
  [SANS, "Inter_700Bold.ttf", "700"],
  [SANS, "Inter_800ExtraBold.ttf", "800"],
  ["Ionicons", "Ionicons.ttf", "400"],
];
export const fontlariYukle = () =>
  Promise.all(fontlar.map(([family, dosya, weight]) => loadFont({ family, url: staticFile(`fonts/${dosya}`), weight })));

export const tl = (v: number, isaret = false) =>
  `${isaret && v > 0 ? "+" : ""}${v < 0 ? "−" : ""}${new Intl.NumberFormat("tr-TR").format(Math.abs(Math.round(v)))} ₺`;

// ------------------------------------------------------------------ animasyon
export const useYay = (gecikme = 0, cfg: { damping?: number; mass?: number; stiffness?: number } = {}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - gecikme, fps, config: { damping: 15, mass: 0.7, stiffness: 120, ...cfg } });
};

export const useAra = (bas: number, son: number) => {
  const f = useCurrentFrame();
  return interpolate(f, [bas, son], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

/** Alttan kayarak, büyüyerek beliren sarmalayıcı. */
export const Giris: React.FC<{
  gecikme?: number;
  kay?: number;
  kayX?: number;
  olcek0?: number;
  style?: CSSProperties;
  children: ReactNode;
}> = ({ gecikme = 0, kay = 50, kayX = 0, olcek0 = 0.92, style, children }) => {
  const s = useYay(gecikme);
  const f = useCurrentFrame();
  const o = interpolate(f - gecikme, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity: o,
        transform: `translate(${(1 - s) * kayX}px, ${(1 - s) * kay}px) scale(${olcek0 + (1 - olcek0) * s})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ------------------------------------------------------------------ yapı taşları
export const Ikon: React.FC<{ ad: string; boyut: number; renk: string; style?: CSSProperties }> = ({
  ad,
  boyut,
  renk,
  style,
}) => (
  <span style={{ fontFamily: "Ionicons", fontSize: boyut, color: renk, lineHeight: 1, display: "inline-block", ...style }}>
    {String.fromCodePoint((glif as Record<string, number>)[ad])}
  </span>
);

/** Kelime kelime aşağıdan açılan serif başlık. */
export const Baslik: React.FC<{
  satirlar: string[];
  renk?: string;
  vurgu?: string[];
  vurguRenk?: string;
  boyut?: number;
  gecikme?: number;
  top?: number;
}> = ({ satirlar, renk = R.yazi, vurgu = [], vurguRenk = R.turuncu, boyut = 96, gecikme = 0, top = 240 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let sira = 0;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, textAlign: "center" }}>
      {satirlar.map((satir, si) => (
        <div key={si} style={{ display: "flex", justifyContent: "center", gap: boyut * 0.24, lineHeight: 1.1 }}>
          {satir.split(" ").map((k, ki) => {
            const s = spring({ frame: f - gecikme - sira++ * 3, fps, config: { damping: 16, mass: 0.6 } });
            const temiz = k.replace(/[,.?!:…]/g, "");
            return (
              <span key={ki} style={{ display: "inline-block", overflow: "hidden", paddingBottom: boyut * 0.12 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: SERIF,
                    fontWeight: 700,
                    fontSize: boyut,
                    letterSpacing: -1,
                    color: vurgu.includes(temiz) ? vurguRenk : renk,
                    transform: `translateY(${(1 - s) * 115}%)`,
                  }}
                >
                  {k}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const AltMetin: React.FC<{ children: ReactNode; top: number; renk?: string; gecikme?: number; boyut?: number }> = ({
  children,
  top,
  renk = R.soluk,
  gecikme = 12,
  boyut = 38,
}) => (
  <Giris gecikme={gecikme} kay={20} olcek0={1} style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center" }}>
    <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: boyut, color: renk, lineHeight: 1.35 }}>{children}</div>
  </Giris>
);

export const Arkaplan: React.FC<{ tur: "turuncu" | "krem" }> = ({ tur }) => {
  const f = useCurrentFrame();
  const turuncu = tur === "turuncu";
  const leke = turuncu ? "rgba(255,255,255,0.13)" : "rgba(224,106,74,0.10)";
  const x1 = 20 + Math.sin(f / 45) * 8;
  const y1 = 22 + Math.cos(f / 55) * 6;
  const x2 = 80 + Math.cos(f / 50) * 8;
  const y2 = 78 + Math.sin(f / 40) * 6;
  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(circle at ${x1}% ${y1}%, ${leke} 0, transparent 34%)`,
          `radial-gradient(circle at ${x2}% ${y2}%, ${leke} 0, transparent 38%)`,
          turuncu ? `linear-gradient(180deg, ${R.turuncu}, ${R.turuncuKoyu})` : `linear-gradient(180deg, ${R.krem}, ${R.seftali})`,
        ].join(","),
      }}
    />
  );
};

export const GOLGE = "0 30px 60px rgba(40,20,10,0.22), 0 8px 18px rgba(40,20,10,0.12)";

export const Kart: React.FC<{ style?: CSSProperties; children: ReactNode }> = ({ style, children }) => (
  <div style={{ background: R.beyaz, borderRadius: 36, boxShadow: GOLGE, ...style }}>{children}</div>
);

/** Ham ekran görüntüsü (1080×2400) çerçeveli telefon içinde. */
export const Telefon: React.FC<{ ekran: string; genislik?: number; style?: CSSProperties }> = ({
  ekran,
  genislik = 620,
  style,
}) => {
  const c = Math.round(genislik * 0.034);
  const yuk = Math.round((genislik * 2400) / 1080);
  return (
    <div
      style={{
        width: genislik + 2 * c,
        height: yuk + 2 * c,
        padding: c,
        background: "#18181A",
        borderRadius: genislik * 0.13,
        boxShadow: "0 50px 90px rgba(40,20,10,0.35), 0 12px 26px rgba(40,20,10,0.2)",
        position: "relative",
        ...style,
      }}
    >
      <Img src={staticFile(`ekran/${ekran}.png`)} style={{ width: genislik, height: yuk, borderRadius: genislik * 0.1, display: "block" }} />
      <div
        style={{
          position: "absolute",
          top: c + genislik * 0.035,
          left: "50%",
          width: genislik * 0.04,
          height: genislik * 0.04,
          marginLeft: -genislik * 0.02,
          borderRadius: "50%",
          background: "#0E0E10",
        }}
      />
    </div>
  );
};

/** Telefonu yatay ortalar; alttan yaylanarak gelir. */
export const OrtaTelefon: React.FC<{ ekran: string; top?: number; genislik?: number; gecikme?: number }> = ({
  ekran,
  top = 600,
  genislik = 600,
  gecikme = 0,
}) => {
  const s = useYay(gecikme, { damping: 18, mass: 0.9 });
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: top + (1 - s) * 1100 - f * 0.25,
        left: (1080 - genislik * 1.068) / 2,
      }}
    >
      <Telefon ekran={ekran} genislik={genislik} />
    </div>
  );
};

export const IkonKutu: React.FC<{ ad: string; renk: string; boyut?: number }> = ({ ad, renk, boyut = 76 }) => (
  <div
    style={{
      width: boyut,
      height: boyut,
      borderRadius: boyut * 0.27,
      background: `color-mix(in srgb, ${renk} 15%, white)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <Ikon ad={ad} boyut={boyut * 0.5} renk={renk} />
  </div>
);

export const Cubuk: React.FC<{ oran: number; renk: string; yukseklik?: number; zemin?: string }> = ({
  oran,
  renk,
  yukseklik = 14,
  zemin = "#EFE9E3",
}) => (
  <div style={{ height: yukseklik, borderRadius: yukseklik, background: zemin, overflow: "hidden" }}>
    <div style={{ width: `${Math.max(0, Math.min(1, oran)) * 100}%`, height: "100%", borderRadius: yukseklik, background: renk }} />
  </div>
);

export const Rozet: React.FC<{ children: ReactNode; renk?: string; zemin?: string; boyut?: number }> = ({
  children,
  renk = R.turuncu,
  zemin = "#FDECE5",
  boyut = 24,
}) => (
  <span
    style={{
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: boyut,
      color: renk,
      background: zemin,
      borderRadius: 999,
      padding: `${boyut * 0.3}px ${boyut * 0.7}px`,
      letterSpacing: 1,
    }}
  >
    {children}
  </span>
);

export const Simge: React.FC<{ boyut: number }> = ({ boyut }) => (
  <Img
    src={staticFile("simge.png")}
    style={{ width: boyut, height: boyut, borderRadius: boyut * 0.23, boxShadow: "0 24px 50px rgba(40,20,10,0.35)" }}
  />
);
