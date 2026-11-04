import React from "react";
import { Composition } from "remotion";
import { NikeShort, NIKE_FRAMES } from "./videos/nike/Nike";
import { ParachuteShort, PARACHUTE_FRAMES } from "./videos/parachute/Bridge";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NikeShort" component={NikeShort} durationInFrames={NIKE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ParachutePreview" component={ParachuteShort} durationInFrames={PARACHUTE_FRAMES} fps={30} width={540} height={960} />
  </>
);
