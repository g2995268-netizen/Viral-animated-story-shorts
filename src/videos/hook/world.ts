// One Caribbean islet: sand, palm, boat, rock, hammock, seven holes. Same sky, water and two-tone light as the bridge.
import * as THREE from "three";
import { Batch, V, lam, boxGeo } from "./build";
import { ctex, planksHD, waterNear, waterFar, cloudHD, stoneHD } from "./paint";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { FPS, D0, SHOTS, camAt, hookPose, holesNow, HOLES, ShotDef, V3 } from "./story";

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.22 * wTime, 0.08 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 7.0), texture2D(wFarTex, wp / 36.0 + 0.2), smoothstep(18.0, 80.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.55);
  wc = mix(wc, wCrest, mk.r * 0.75);
  wc = mix(wc, wGlint, mk.b * (0.25 + 0.55 * wf));
  diffuseColor.rgb = wc;`;

const sandTex = () => ctex("isleSand", 1024, 1024, (g, r) => {
  g.fillStyle = "#e7c98a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = r() < 0.5 ? "#f3ddb0" : "#c9a56a";
    g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 1 + r() * 2);
  }
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2;
    const x = r() * 1024, y = r() * 1024;
    g.beginPath(); g.arc(x, y, 6 + r() * 8, 0.2, 1.4); g.stroke();
  }
});
const leafTex = () => ctex("palmLeaf", 256, 96, (g) => {
  g.clearRect(0, 0, 256, 96);
  g.fillStyle = "#2f9a45";
  g.beginPath(); g.moveTo(6, 48); g.quadraticCurveTo(120, 6, 248, 48); g.quadraticCurveTo(120, 90, 6, 48); g.fill();
  g.strokeStyle = "#1d6a30"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(12, 48); g.lineTo(236, 48); g.stroke();
  for (let i = 0; i < 8; i++) {
    g.beginPath(); g.moveTo(30 + i * 24, 48); g.lineTo(40 + i * 24, 18); g.moveTo(30 + i * 24, 48); g.lineTo(40 + i * 24, 78); g.stroke();
  }
});
const sailTex = () => ctex("sail", 512, 640, (g) => {
  g.fillStyle = "#f4efe2"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "#241726"; g.lineWidth = 18; g.strokeRect(16, 16, 480, 608);
  g.fillStyle = "#241726";
  g.beginPath(); g.arc(256, 250, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f4efe2";
  g.beginPath(); g.arc(230, 230, 16, 0, 7); g.arc(282, 230, 16, 0, 7); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 14;
  g.beginPath(); g.moveTo(150, 360); g.lineTo(256, 430); g.lineTo(362, 360); g.moveTo(256, 320); g.lineTo(256, 470); g.stroke();
});

export class World {
  readonly root = new THREE.Group();
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fog = new THREE.Fog("#b7e6f4", 18, 220);
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private fronds: THREE.Mesh[] = [];
  private boat: THREE.Group; private sail: THREE.Mesh;
  private shovel: THREE.Group; private chest: THREE.Group; private holes: THREE.Group[] = [];
  private lantern: THREE.PointLight;
  private WU: Record<string, { value: THREE.Color | THREE.Vector3 | THREE.Texture | number }>;
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere(); private frustum = new THREE.Frustum();

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0,c1,c2,c3,c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y,-1.0,1.0));
          vec3 c = mix(c0,c1,smoothstep(0.0,e.x,el)); c = mix(c,c2,smoothstep(e.x,e.y,el));
          c = mix(c,c3,smoothstep(e.y,e.z,el)); c = mix(c,c4,smoothstep(e.z,e.w,el));
          gl_FragColor = vec4(c,1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), this.skyMat);
    this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("moon", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 20, 64, 64, 60); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("halo", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    for (const m of [this.sunDisc, this.sunHalo]) { m.layers.set(NOINK); m.frustumCulled = false; R.add(m); }
    this.hemi = new THREE.HemisphereLight("#d8f3ff", "#c6a36a", 0.55);
    this.sun = new THREE.DirectionalLight("#fff6e4", 2.9);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.lantern = new THREE.PointLight("#ffb15a", 0, 8, 2);
    this.lantern.position.set(-3.2, 1.6, -0.4); R.add(this.lantern);

    const b = new Batch();
    const sand = lam("isleSand", () => ({ map: sandTex(), side: THREE.DoubleSide }));
    const wet = lam("wetSand", () => ({ color: "#d7b56a", side: THREE.DoubleSide }));
    const wood = lam("hull", () => ({ map: planksHD() }));
    const bark = lam("bark", () => ({ color: "#7a4b2a" }));
    const rock = lam("rock", () => ({ map: stoneHD("isleRock", ["#b7aa98", "#a89884", "#c8bba8", "#9a8c7a"], "#7d7268") }));
    const leaf = lam("leaf", () => ({ map: leafTex(), alphaTest: 0.4, side: THREE.DoubleSide }));
    const rope = lam("rope", () => ({ color: "#c2a36a" }));
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3c4148", specular: "#9a9a9a", shininess: 40 }), 0.15);
    const gold = lam("gold", () => ({ color: "#e2b343" }));
    const cloth = lam("hammock", () => ({ color: "#c4553a", side: THREE.DoubleSide }));

    const flat = (r: number, y: number, sx = 1, sz = 0.78) => {
      const g = new THREE.CircleGeometry(r, 72);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), yy = p.getY(i); p.setXYZ(i, x * sx, y, yy * sz); }
      g.computeVertexNormals();
      return g;
    };
    b.add(flat(14.2, 0.04), sand);
    b.add(flat(16.4, -0.02, 1, 0.8), wet);
    const mound = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (const [x, z, s] of [[-90, 70, 10], [100, -50, 12], [-40, -120, 14], [50, 100, 8]] as const)
      b.add(mound, sand, new THREE.Matrix4().compose(V(x, -0.4, z), new THREE.Quaternion(), V(s, s * 0.22, s)));
    // palm trunk
    const trunk = new THREE.CylinderGeometry(0.22, 0.38, 5.2, 8); trunk.translate(0, 2.6, 0);
    b.add(trunk, bark, new THREE.Matrix4().makeTranslation(-5, 0, -1));
    // rock
    const rk = new THREE.DodecahedronGeometry(1.15, 0);
    b.add(rk, rock, new THREE.Matrix4().compose(V(3.5, 0.55, -4.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.6, 0.2)), V(1.3, 0.9, 1.1)));
    // posts and hammock cloth
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6).translate(0, 0.85, 0), bark, new THREE.Matrix4().makeTranslation(-5.2, 0, -0.4));
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6).translate(0, 0.85, 0), bark, new THREE.Matrix4().makeTranslation(-2.2, 0, -1.8));
    const hammock = new THREE.PlaneGeometry(2.6, 0.55);
    const hp = hammock.attributes.position;
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i); hp.setXYZ(i, x, 0.58 + Math.abs(x) * 0.08, y); }
    hammock.computeVertexNormals();
    b.add(hammock, cloth, new THREE.Matrix4().makeTranslation(-3.7, 0, -1.1));
    // barrel, crate, anchor, rope coil
    b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.7, 10).translate(0, 0.35, 0), wood, new THREE.Matrix4().makeTranslation(5.2, 0, 1.2));
    b.add(boxGeo(V(4.3, 0, 2.1), V(5.2, 0.55, 2.9)), wood);
    b.add(new THREE.TorusGeometry(0.35, 0.06, 6, 10), rope, new THREE.Matrix4().compose(V(6.4, 0.08, 1.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), V(1, 1, 1)));
    const anc = new THREE.TorusGeometry(0.28, 0.05, 6, 10); anc.rotateX(Math.PI / 2);
    b.add(anc, iron, new THREE.Matrix4().makeTranslation(8.8, 0.2, 6.4));
    b.build(R);

    // fronds, added loose so they sway
    const leafM = leaf;
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), leafM);
      m.position.set(-5, 5.15, -1);
      m.castShadow = true; m.rotation.order = "YXZ";
      this.fronds.push(m); R.add(m);
    }
    // boat
    this.boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.15), wood);
    hull.position.y = 0.25; hull.castShadow = true; hull.receiveShadow = true;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.1, 4), wood);
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(2.0, 0.28, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), bark);
    mast.position.set(-0.2, 1.7, 0);
    this.sail = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8), lam("sail", () => ({ map: sailTex(), side: THREE.DoubleSide })));
    this.sail.position.set(0.15, 1.7, 0);
    this.boat.add(hull, bow, mast, this.sail);
    this.boat.position.set(5.4, 0, 3.6); this.boat.rotation.y = -0.4;
    R.add(this.boat);
    // chest
    this.chest = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.45), wood);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.48), gold);
    body.position.y = 0.24; band.position.y = 0.42;
    this.chest.add(body, band); this.chest.position.set(-4.4, 0, 1.7); R.add(this.chest);
    // shovel
    this.shovel = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 6), bark);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.04), iron);
    blade.position.y = -0.78;
    this.shovel.add(handle, blade); R.add(this.shovel);
    // holes
    HOLES.forEach((p) => {
      const g = new THREE.Group();
      const pit = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), lam("pit", () => ({ color: "#5a4632" })));
      pit.rotation.x = -Math.PI / 2; pit.position.y = 0.03;
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), sand);
      mound.scale.set(1.2, 0.45, 1.2); mound.position.set(0.7, 0, 0.2);
      g.add(pit, mound); g.position.set(p[0], 0, p[2]); g.visible = false; R.add(g); this.holes.push(g);
    });

    const wNear = waterNear(), wFar = waterFar();
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3() }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "isleWater";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), waterM);
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.35; sea.receiveShadow = true; R.add(sea);

    this.cloudMaps = {
      day: [0, 1, 2].map((k) => cloudHD(k, LOOK.day.cloud)),
      golden: [0, 1, 2].map((k) => cloudHD(k, LOOK.golden.cloud)),
      night: [0, 1, 2].map((k) => cloudHD(k, LOOK.night.cloud)),
    };
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, d = 280 + (i % 3) * 40;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 3], transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 70 + (i % 3) * 18, Math.sin(a) * d);
      m.scale.set(90, 40, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 4) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.1 + 6, 10, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 80); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 8; sc.far = 180; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const moon = s.light !== "day";
    this.sunDisc.visible = this.sunHalo.visible = moon;
    if (moon) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 700);
      this.sunDisc.scale.setScalar(s.light === "night" ? 28 : 40);
      this.sunHalo.position.copy(this.sunDisc.position);
      this.sunHalo.scale.setScalar(s.light === "night" ? 90 : 220);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 3];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value as THREE.Color); untone(wc.mid, W.wMidC.value as THREE.Color); untone(wc.far, W.wFarC.value as THREE.Color);
    untone(wc.crest, W.wCrest.value as THREE.Color); untone(wc.trough, W.wTrough.value as THREE.Color); untone(wc.glint, W.wGlint.value as THREE.Color);
    (W.wShade.value as THREE.Vector3).set(...wc.shade); (W.wTime as { value: number }).value = t;

    this.fronds.forEach((m, i) => {
      const a = (i / 7) * Math.PI * 2 + Math.sin(t * 1.3 + i) * 0.08;
      m.rotation.y = a; m.rotation.z = 0.15 + Math.sin(t * 1.7 + i) * 0.05; m.rotation.x = 1.05;
    });
    this.boat.position.y = Math.sin(t * 1.3) * 0.06;
    this.boat.rotation.z = Math.sin(t * 1.1) * 0.03;
    this.sail.rotation.y = Math.sin(t * 1.6) * 0.12;
    const hp = hookPose(t);
    this.shovel.position.set(hp.x + 0.35, 0.7 + (hp.dig ? Math.sin(t * 8) * 0.15 : 0), hp.z + 0.15);
    this.shovel.rotation.z = hp.dig ? -0.5 + Math.sin(t * 8) * 0.7 : 0.35;
    this.shovel.visible = !hp.hammock;
    this.chest.visible = t < 20.3;
    this.lantern.intensity = s.light === "night" ? 4.5 : 0;
    const holes = holesNow(t);
    this.holes.forEach((g, i) => {
      const on = i < holes.open && holes.wipe < 0.98;
      g.visible = on;
      g.scale.setScalar(on ? 1 - holes.wipe : 0);
    });

    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1, p.z), 2.2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [480, 800, 0.8];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      const sc = p.scale ?? 1; a.mesh.scale.set(p.mirror ? -sc : sc, sc, sc);
      a.mesh.castShadow = L.actorShadow; used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft); e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1); fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
