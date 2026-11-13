import { Composition } from "remotion";
import { Tanitim, TOPLAM_KARE } from "./Tanitim";
import { fontlariYukle } from "./tema";

fontlariYukle();

export const Root: React.FC = () => (
  <Composition
    id="Tanitim"
    component={Tanitim}
    durationInFrames={TOPLAM_KARE}
    fps={30}
    width={1080}
    height={1920}
    // Ses: seslendirme + müzik + efekt karışımı (ses/karistir.py → public/ses.wav). null = sessiz.
    defaultProps={{ ses: "ses.wav" as string | null }}
  />
);
