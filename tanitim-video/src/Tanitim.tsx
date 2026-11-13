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

export const GECIS = 16;

type Gecis = "yukari" | "sola" | "silme" | "solma";
// Sahne sırası ve süreleri (kare, 30 fps). Geçiş, önceki sahneyle bu sahne arasında.
export const SAHNELER: { C: React.FC; sure: number; gecis: Gecis }[] = [
  { C: Kanca, sure: 90, gecis: "solma" },
  { C: Marka, sure: 72, gecis: "silme" },
  { C: Ses, sure: 165, gecis: "yukari" },
  { C: YapayZeka, sure: 140, gecis: "sola" },
  { C: GelirGider, sure: 125, gecis: "yukari" },
  { C: Kategoriler, sure: 120, gecis: "sola" },
  { C: Limit, sure: 125, gecis: "yukari" },
  { C: Hedef, sure: 130, gecis: "sola" },
  { C: Sabit, sure: 125, gecis: "yukari" },
  { C: DisaAktar, sure: 115, gecis: "sola" },
  { C: Hane, sure: 125, gecis: "yukari" },
  { C: Guven, sure: 105, gecis: "sola" },
  { C: Kapanis, sure: 150, gecis: "silme" },
];

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

export const Tanitim: React.FC<{ muzik: string | null }> = ({ muzik }) => (
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
    {muzik && <Audio src={staticFile(muzik)} volume={(f) => Math.min(1, f / 15) * 0.8} />}
  </AbsoluteFill>
);
