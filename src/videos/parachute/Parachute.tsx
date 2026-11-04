// Preview and final share this component. Canvas size follows the composition.
// Post chain: ink, lens, bloom, neutral tone map, grade. No captions.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../nike/ink";
import { LensBlur, GrainEffect } from "../nike/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../nike/grade";
import { TOTAL, dofAt, lightName } from "./story";

export const PARACHUTE_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 5, radius: 0.55 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
  }), [camera, scene]);
  const post = useMemo(() => (
    <EffectComposer multisampling={2}>
      <primitive object={fx.ink} />
      <primitive object={fx.lens.pre} />
      <primitive object={fx.lens.main} />
      <primitive object={fx.bloom} />
      <primitive object={fx.tone} />
      <primitive object={fx.grade} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const look = world.update(f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus); else fpt.copy(look);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, lightName(f));
  fx.grain.seed = f;
  return (
    <>
      <primitive object={world.root} />
      {post}
    </>
  );
};

export const ParachuteShort: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#9ec4ea" }}>
      <ThreeCanvas width={width} height={height}
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
        camera={{ fov: 64, near: 0.08, far: 25000 }}>
        <Inner />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
