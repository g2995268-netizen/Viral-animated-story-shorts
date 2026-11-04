// The fall, seen from the jumper. One painted valley big enough to read as a map at 3300 m,
// and solid objects — lake, road, trees, houses, snow, a car — that get larger as the ground does.
import * as THREE from "three";
import { ctex } from "../nike/paint";
import { Batch, house, lam, V } from "../nike/build";
import { LIGHTS, LOOK } from "../nike/lights";
import { CHAR, TONE, untone } from "../nike/shade";
import { NOINK } from "../nike/ink";
import { FPS, camAt, fallY, jumperXZ, smooth } from "./story";

export const loadKit = () => Promise.resolve({});

const discTex = () => ctex("pSun", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 50, 64, 64, 64);
  gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

const groundTex = () => ctex("valley", 2048, 2048, (g, r) => {
  const X = (x: number) => ((x + 4000) / 8000) * 2048;
  const Z = (z: number) => ((z + 4000) / 8000) * 2048;
  const fields = ["#7ea24a", "#c4a15a", "#8c7344", "#5f8a3e", "#d2c08a", "#6e9144", "#a68458", "#4f7a55", "#b7c46a"];
  for (let gz = 0; gz < 16; gz++) for (let gx = 0; gx < 16; gx++) {
    g.fillStyle = fields[(gx * 3 + gz * 5) % fields.length];
    const jx = (r() - 0.5) * 18, jz = (r() - 0.5) * 18;
    g.fillRect(gx * 128 + jx, gz * 128 + jz, 120, 116);
    g.fillStyle = "rgba(40,55,28,0.28)";
    g.fillRect(gx * 128, gz * 128, 128, 3);
    g.fillRect(gx * 128, gz * 128, 3, 128);
  }
  g.strokeStyle = "#2c7498";
  g.lineWidth = 22;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(0, Z(700));
  for (let x = -4000; x <= 4000; x += 200) g.lineTo(X(x), Z(700 + Math.sin(x * 0.002) * 180));
  g.stroke();
  g.fillStyle = "#b56a52";
  for (let i = 0; i < 36; i++) g.fillRect(X(-1100) + (i % 6) * 18, Z(1200) + Math.floor(i / 6) * 16, 11, 9);
  g.fillStyle = "#2f5a2c";
  g.beginPath(); g.ellipse(X(220), Z(-90), 90, 60, 0.3, 0, 7); g.fill();
  g.fillStyle = "#245024";
  g.beginPath(); g.ellipse(X(250), Z(-40), 40, 24, 0, 0, 7); g.fill();
  g.fillStyle = "#e7eef2";
  g.beginPath(); g.ellipse(X(60), Z(50), 70, 42, 0.2, 0, 7); g.fill();
  g.fillStyle = "#cbb892";
  g.beginPath(); g.ellipse(X(0), Z(0), 86, 64, 0, 0, 7); g.fill();
  g.fillStyle = "#1f6484";
  g.beginPath(); g.ellipse(X(0), Z(0), 70, 50, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(236,244,248,0.4)";
  g.beginPath(); g.ellipse(X(-16), Z(-10), 18, 8, -0.5, 0, 7); g.fill();
  g.fillStyle = "#7d756c";
  g.fillRect(0, Z(250) - 10, 2048, 22);
  g.fillStyle = "#e4dcc8";
  for (let x = 0; x < 2048; x += 28) g.fillRect(x, Z(250) - 1, 12, 2);
});

const cloudTex = () => ctex("pCloud", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (const [x, y, rx, ry] of [[80, 140, 70, 36], [180, 120, 90, 40], [300, 150, 80, 34], [400, 110, 60, 28]] as const) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  }
});

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};

export class World {
  root = new THREE.Group();
  private rig = new THREE.Group();
  private streamer = new THREE.Group();
  private canopy = new THREE.Group();
  private cutPillow!: THREE.Mesh;
  private resHandle!: THREE.Mesh;
  private palm!: THREE.Group;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#b8d0ec", 80, 8000);
  private povBits: THREE.Object3D[] = [];

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
      },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0,c1,c2,c3,c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y,-1.0,1.0));
          vec3 c = mix(c0,c1,smoothstep(0.0,e.x,el));
          c = mix(c,c2,smoothstep(e.x,e.y,el));
          c = mix(c,c3,smoothstep(e.y,e.z,el));
          c = mix(c,c4,smoothstep(e.z,e.w,el));
          gl_FragColor = vec4(c,1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 28, 16), this.skyMat);
    this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#dcecff", "#8a7a62", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.position.set(800, 1400, 400);
    R.add(this.hemi, this.sun, this.sun.target);

    const groundMat = lam("valley", () => ({ map: groundTex() }));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    R.add(ground);

    this.addLakeAndRoad(R);
    this.addTrees(R);
    this.addHouses(R);
    this.addSnowAndSlope(R);
    this.addClouds(R);
    this.addCar(R);
    this.buildPovRig();
    this.buildStreamer();
    this.buildCanopy();
    this.rig.add(this.streamer, this.canopy);
    R.add(this.rig);
  }

  private addLakeAndRoad(R: THREE.Object3D) {
    const sand = lam("shore", () => ({ color: "#d8c49a" }));
    const water = lam("lake", () => ({ color: "#2a6d88" }));
    const shore = mesh(new THREE.PlaneGeometry(640, 460), sand, R);
    shore.rotation.x = -Math.PI / 2; shore.position.y = 0.04; shore.layers.set(NOINK);
    const lake = mesh(new THREE.PlaneGeometry(500, 340), water, R);
    lake.rotation.x = -Math.PI / 2; lake.position.y = 0.1; lake.layers.set(NOINK);
    const shine = new THREE.Mesh(
      new THREE.CircleGeometry(60, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.55, 1.6), transparent: true, opacity: 0.45 }),
    );
    shine.rotation.x = -Math.PI / 2; shine.position.set(-40, 0.16, -30); shine.layers.set(NOINK); R.add(shine);
    shine.geometry = new THREE.PlaneGeometry(120, 70);
    const road = lam("road", () => ({ color: "#8a8174" }));
    const line = lam("roadLine", () => ({ color: "#e4dcc8" }));
    mesh(new THREE.BoxGeometry(1600, 0.1, 28), road, R, 0, 0.08, 290);
    for (let x = -760; x <= 760; x += 36) mesh(new THREE.BoxGeometry(14, 0.04, 1.1), line, R, x, 0.16, 290);
  }

  private addTrees(R: THREE.Object3D) {
    const bark = lam("barkP", () => ({ color: "#7a5134" }));
    const leaf = [0, 1, 2].map((i) => lam("leafP" + i, () => ({ color: ["#3f7a34", "#4e8c3c", "#2f6230"][i] })));
    const spots: [number, number, number][] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const rad = 30 + (i % 6) * 14;
      spots.push([230 + Math.cos(a) * rad, -100 + Math.sin(a) * rad * 0.75, 14 + (i % 4) * 2]);
    }
    for (let i = 0; i < 16; i++) spots.push([40 + i * 9, 20 + (i % 3) * 8, 16 + (i % 3) * 2]);
    for (const [x, z, h] of spots) {
      mesh(new THREE.CylinderGeometry(0.25, 0.4, h * 0.45, 6), bark, R, x, h * 0.22, z);
      const crown = mesh(new THREE.SphereGeometry(h * 0.42, 10, 8), leaf[Math.abs(Math.floor(x + z)) % 3], R, x, h * 0.62, z);
      crown.scale.set(1.2, 0.85, 1.2);
    }
  }

  private addHouses(R: THREE.Object3D) {
    const b = new Batch();
    const row: [number, number, number][] = [[340, -230, 0.2], [362, -210, 0.6], [318, -200, -0.3], [390, -250, 1], [-900, 1100, 0.4], [-860, 1140, 0.2]];
    row.forEach(([x, z, yaw], i) => house(b, x, z, yaw, 8 + (i % 3), 7, 6.2 + (i % 2), i, 0));
    b.build(R);
    // barn and fence in the landing field, so the last seconds are not a bare lawn
    const barn = lam("barn", () => ({ color: "#8d4a3a" }));
    const roof = lam("barnRoof", () => ({ color: "#6a5344" }));
    mesh(new THREE.BoxGeometry(14, 6, 9), barn, R, 330, 3, -250);
    mesh(new THREE.BoxGeometry(15, 0.5, 10), roof, R, 330, 6.3, -250);
    const fence = lam("fence", () => ({ color: "#c2b39a" }));
    for (let i = 0; i < 14; i++) mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), fence, R, 300 + i * 4, 0.65, -210);
    mesh(new THREE.BoxGeometry(56, 0.14, 0.14), fence, R, 326, 1.05, -210);
  }

  private addSnowAndSlope(R: THREE.Object3D) {
    const snow = lam("snow", () => ({ color: "#e7eef2" }));
    const hill = lam("hill", () => ({ color: "#7a8f52" }));
    const pad = mesh(new THREE.CircleGeometry(150, 28), snow, R, 55, 0.2, 55);
    pad.rotation.x = -Math.PI / 2;
    const slope = mesh(new THREE.BoxGeometry(180, 28, 90), hill, R, 150, 6, 10);
    slope.rotation.z = -0.42;
  }

  private addClouds(R: THREE.Object3D) {
    const mat = new THREE.MeshBasicMaterial({ map: cloudTex(), transparent: true, depthWrite: false, opacity: 0.9 });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(380, 160), mat);
      m.position.set(-200 + i * 90, 2720 + (i % 3) * 30, 200 - i * 40);
      m.layers.set(NOINK);
      R.add(m);
    }
  }

  private addCar(R: THREE.Object3D) {
    const body = lam("car", () => ({ color: "#c4553a" }));
    const glass = lam("glass", () => ({ color: "#9ec4de" }));
    const tyre = lam("tyreP", () => ({ color: "#222" }));
    const car = new THREE.Group();
    mesh(new THREE.BoxGeometry(4.2, 1.1, 1.8), body, car, 0, 0.9, 0);
    mesh(new THREE.BoxGeometry(2.1, 0.7, 1.6), glass, car, -0.2, 1.7, 0);
    for (const x of [-1.3, 1.3]) for (const z of [-0.8, 0.8]) {
      const w = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), tyre, car, x, 0.38, z);
      w.rotation.z = Math.PI / 2;
    }
    // an arm out the driver's window, the literal picture for the analogy
    const skin = lam("skin", () => ({ color: "#e7b48a" }));
    const sleeve = lam("sleeve", () => ({ color: "#245c9a" }));
    mesh(new THREE.BoxGeometry(0.9, 0.28, 0.28), sleeve, car, 0.3, 1.3, 1.15);
    mesh(new THREE.BoxGeometry(0.7, 0.16, 0.42), skin, car, 1.05, 1.22, 1.35);
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), skin, car, 1.4, 1.2, 1.18 + i * 0.1);
    car.position.set(200, 0, 300);
    R.add(car);
  }

  private buildPovRig() {
    const glove = lam("glove", () => ({ color: "#c4553a" }));
    const suit = lam("suit", () => ({ color: "#245c9a" }));
    const boot = lam("boot", () => ({ color: "#2a241e" }));
    const metal = lam("metal", () => ({ color: "#c5ccd4" }));
    const pad = lam("pad", () => ({ color: "#1c1e24" }));
    const face = lam("dial", () => ({ color: "#f4f1ea" }));
    const needle = lam("needle", () => ({ color: "#b23b3b" }));
    const makeGlove = (side: number) => {
      const g = new THREE.Group();
      mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), suit, g, 0, 0, 0.12);
      mesh(new THREE.BoxGeometry(0.18, 0.08, 0.2), glove, g);
      for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.035, 0.04, 0.07), glove, g, -0.06 + i * 0.04, 0.02, -0.12);
      g.position.set(side * 0.46, -0.38, -0.95);
      g.scale.setScalar(0.72);
      return g;
    };
    const left = makeGlove(-1);
    const right = makeGlove(1);
    this.rig.add(left, right);
    // boots at the bottom of the view, so the first frame is a body, not an empty map
    for (const s of [-1, 1]) {
      const b = mesh(new THREE.BoxGeometry(0.14, 0.08, 0.32), boot, this.rig, s * 0.12, -0.42, -0.55);
      b.rotation.x = 0.5;
    }
    // helmet lip
    const lip = mesh(new THREE.TorusGeometry(0.55, 0.035, 6, 16, Math.PI), pad, this.rig);
    lip.rotation.x = 1.2; lip.position.set(0, 0.28, -0.45);
    // altimeter on the left wrist
    const watch = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), metal, watch);
    const dial = mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 16), face, watch, 0, 0.012, 0);
    void dial;
    const nd = mesh(new THREE.BoxGeometry(0.034, 0.004, 0.004), needle, watch, 0.012, 0.02, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mesh(new THREE.BoxGeometry(i % 3 === 0 ? 0.012 : 0.007, 0.003, 0.003), pad, watch, Math.cos(a) * 0.03, 0.018, Math.sin(a) * 0.03);
    }
    nd.name = "needle";
    watch.rotation.x = Math.PI / 2;
    watch.position.set(-0.22, -0.16, -0.42);
    watch.name = "watch";
    this.rig.add(watch);
    // chest handles
    this.cutPillow = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), lam("pillow", () => ({ color: "#c83a3a" })), this.rig, -0.1, -0.3, -0.58);
    this.resHandle = mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 10), metal, this.rig, 0.12, -0.3, -0.58);
    mesh(new THREE.BoxGeometry(0.08, 0.05, 0.03), lam("aad", () => ({ color: "#d8d4cc" })), this.rig, 0.02, -0.28, -0.6);
    const btn = mesh(new THREE.BoxGeometry(0.02, 0.012, 0.008), lam("redbtn", () => ({ color: "#c83a3a" })), this.rig, 0.02, -0.25, -0.585);
    btn.name = "aadbtn";
    // open palm for the wind analogy
    this.palm = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), glove, this.palm);
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.04, 0.025, 0.07), glove, this.palm, -0.07 + i * 0.045, 0.01, -0.1);
    this.palm.position.set(0.42, -0.05, -0.4);
    this.palm.visible = false;
    this.rig.add(this.palm);
    this.povBits.push(left, right, this.cutPillow, this.resHandle, this.palm, watch);
  }

  private buildStreamer() {
    const nylon = lam("nylon", () => ({ color: "#f3efe4" }));
    const panel = lam("nylon2", () => ({ color: "#e07a3a" }));
    for (let i = 0; i < 6; i++) {
      const rib = mesh(new THREE.BoxGeometry(0.07, 0.42, 0.012), i % 2 ? panel : nylon, this.streamer, (i - 2.5) * 0.09, -i * 0.02, 0);
      rib.name = "rib" + i;
    }
  }

  private buildCanopy() {
    const cloth = lam("reserve", () => ({ color: "#d24a3a" }));
    const lines = lam("lines", () => ({ color: "#f4f1ea" }));
    const dome = mesh(new THREE.CircleGeometry(0.85, 24), cloth, this.canopy);
    dome.position.z = -0.02;
    for (let i = 0; i < 6; i++) {
      const x = -0.55 + i * 0.22;
      mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), lines, this.canopy, x, -0.35, 0.15);
    }
    this.canopy.visible = false;
  }

  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS;
    const c = camAt(f);
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.look);
    cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.08;
    cam.far = 25000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    cam.layers.enable(NOINK);

    const L = LIGHTS.day, K = LOOK.day;
    const y = fallY(t);
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
    untone(L.fog, this.fog.color);
    this.fog.near = Math.max(40, y * 0.2);
    this.fog.far = Math.max(500, y * 2.4);
    scene.fog = this.fog;
    scene.background = null;
    this.sun.target.position.set(c.pos[0], 0, c.pos[2]);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    const Rr = THREE.MathUtils.clamp(y * 0.15 + 20, 20, 180);
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 4000; sc.updateProjectionMatrix();

    const showBody = !c.insert;
    this.rig.visible = showBody;
    if (showBody) {
      this.rig.position.copy(cam.position);
      this.rig.quaternion.copy(cam.quaternion);
      const watch = this.rig.getObjectByName("watch")!;
      const nearWatch = t > 5.5 && t < 11.0;
      watch.position.set(nearWatch ? 0.02 : -0.22, nearWatch ? 0.02 : -0.16, nearWatch ? -0.28 : -0.42);
      watch.scale.setScalar(nearWatch ? 1.55 : 0.7);
      const needle = watch.getObjectByName("needle") as THREE.Mesh;
      needle.rotation.z = -fallY(t) / 3300 * 4.5;
      const pullingCut = t > 18.3 && t < 21.2;
      const pullingRes = t > 22.2 && t < 24.8;
      this.cutPillow.position.set(-0.1, -0.3 + (pullingCut ? 0.12 : 0), -0.58 + (pullingCut ? smooth((t - 18.3) / 0.4) * 0.25 : 0));
      this.resHandle.position.set(0.12, -0.3, -0.58 + (pullingRes ? smooth((t - 22.2) / 0.35) * 0.22 : 0));
      this.palm.visible = t > 45.2 && t < 49.2 && !c.insert;
    }

    const released = Math.max(0, t - 18.55);
    const lookingUp = t > 15.6 && t < 18.45;
    this.streamer.visible = released < 1.6 && showBody;
    this.streamer.position.set(0, lookingUp ? 0.05 : 0.42, lookingUp ? -0.85 : -0.62);
    this.streamer.scale.setScalar(lookingUp ? 1.35 : 0.7);
    this.streamer.children.forEach((ch, i) => {
      ch.rotation.z = Math.sin(t * 14 + i) * (lookingUp ? 0.8 : 0.45);
      ch.position.y = Math.sin(t * 11 + i * 0.7) * 0.12 - released * 1.4;
    });

    const open = smooth((t - 55.55) / 1.3);
    this.canopy.visible = open > 0.02 && showBody;
    this.canopy.position.set(0, 0.58, -1.45);
    this.canopy.scale.setScalar(0.25 + open * 0.6);

    return V(...c.look);
  }
}
