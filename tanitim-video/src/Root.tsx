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
    // Müzik: telifsiz bir parçayı public/muzik.mp3 olarak koy, burada "muzik.mp3" yap.
    defaultProps={{ muzik: null as string | null }}
  />
);
