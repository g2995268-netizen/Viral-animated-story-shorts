// "Лишний". 2D cartoon people in a painted 3D bunker, the bridge-short look:
// ink on the world, lit character cards, lens blur, bloom on the screens, grade last.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";
import { Captions } from "./captions";

export const BUNKER_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 5, radius: 0.55 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const lite = height <= 1000;
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 20, nearScale: 1.15 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.alarm, GRADE_STRENGTH.alarm),
  }), [camera, scene]);
  React.useEffect(() => () => fx.ink.dispose(), [fx]);
  // 540 preview skips ink, lens and extra samples so the whole short can render here.
  // The 1080 composition turns them back on.
  const post = useMemo(() => (
    <EffectComposer multisampling={lite ? 0 : 2}>
      {lite ? null : <primitive object={fx.ink} dispose={null} />}
      {lite ? null : <primitive object={fx.lens.pre} dispose={null} />}
      {lite ? null : <primitive object={fx.lens.main} dispose={null} />}
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx, lite]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene, lite);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, target.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={width} height={height} shadows dpr={1}
        gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1 }}
        camera={{ fov: 40, near: 0.15, far: 500 }}>
        <Inner id={id} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

export const BunkerShort: React.FC = () => {
  const f = useCurrentFrame();
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [0.85, 0.55, 0.28, 0.1][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#1a1014" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff6ee", opacity: flash }} />}
      <Captions />
      <Audio src={staticFile("bunker/mix.wav")} />
    </AbsoluteFill>
  );
};
