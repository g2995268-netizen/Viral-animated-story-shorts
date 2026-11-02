import React from "react";
import { Composition } from "remotion";
import { NikeShort, NIKE_FRAMES } from "./videos/nike/Nike";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NikeShort" component={NikeShort} durationInFrames={NIKE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
