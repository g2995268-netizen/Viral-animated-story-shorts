import React from "react";
import { Composition } from "remotion";
import { BunkerShort, BUNKER_FRAMES } from "./videos/bunker/Bunker";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="BunkerPreview" component={BunkerShort} durationInFrames={BUNKER_FRAMES} fps={30} width={540} height={960} />
    <Composition id="BunkerFinal" component={BunkerShort} durationInFrames={BUNKER_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
