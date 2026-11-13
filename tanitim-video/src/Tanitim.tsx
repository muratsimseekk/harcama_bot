import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Fragment } from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import {
  DisaAktar,
  GelirGider,
  Guven,
  Hane,
  Hedef,
  Kanca,
  Kapanis,
  Kategoriler,
  Limit,
  Marka,
  Ses,
  Sabit,
  YapayZeka,
} from "./sahneler";
import zaman from "./zaman.json";

export const GECIS = zaman.gecis;

type Gecis = "yukari" | "sola" | "silme" | "solma";
// Sahne sırası; süreler (kare, 30 fps) src/zaman.json'da — ses karışımı (ses/karistir.py) da aynı dosyayı okur.
// Geçiş, önceki sahneyle bu sahne arasında.
const SIRA: { C: React.FC; gecis: Gecis }[] = [
  { C: Kanca, gecis: "solma" },
  { C: Marka, gecis: "silme" },
  { C: Ses, gecis: "yukari" },
  { C: YapayZeka, gecis: "sola" },
  { C: GelirGider, gecis: "yukari" },
  { C: Kategoriler, gecis: "sola" },
  { C: Limit, gecis: "yukari" },
  { C: Hedef, gecis: "sola" },
  { C: Sabit, gecis: "yukari" },
  { C: DisaAktar, gecis: "sola" },
  { C: Hane, gecis: "yukari" },
  { C: Guven, gecis: "sola" },
  { C: Kapanis, gecis: "silme" },
];

export const SAHNELER = SIRA.map((s, i) => ({ ...s, sure: zaman.sureler[i] }));

export const TOPLAM_KARE = SAHNELER.reduce((t, s) => t + s.sure, 0) - GECIS * (SAHNELER.length - 1);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sunum = (g: Gecis): TransitionPresentation<any> => {
  switch (g) {
    case "yukari":
      return slide({ direction: "from-bottom" });
    case "sola":
      return slide({ direction: "from-right" });
    case "silme":
      return wipe({ direction: "from-bottom" });
    default:
      return fade();
  }
};

export const Tanitim: React.FC<{ ses: string | null }> = ({ ses }) => (
  <AbsoluteFill style={{ background: "#C45438" }}>
    <TransitionSeries>
      {SAHNELER.map(({ C, sure, gecis }, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <TransitionSeries.Transition
              presentation={sunum(gecis)}
              timing={
                gecis === "solma"
                  ? linearTiming({ durationInFrames: GECIS })
                  : springTiming({ config: { damping: 200 }, durationInFrames: GECIS })
              }
            />
          )}
          <TransitionSeries.Sequence durationInFrames={sure}>
            <C />
          </TransitionSeries.Sequence>
        </Fragment>
      ))}
    </TransitionSeries>
    {ses && <Audio src={staticFile(ses)} />}
  </AbsoluteFill>
);
