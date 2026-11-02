// One town-sized world: David's room, a surplus hangar, the backyard with the missile, and the Pentagon.
// Sky, fog and the two-tone sun follow the bridge look. update() poses one shot.
import * as THREE from "three";
import { Batch, Kit, V, boxGeo, house, lam } from "./build";
import { ctex, cloudHD, cobbleHD, grassHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Actor, Fx, Pool, stage } from "./cast";
import { FPS, HZ, OX, PX, SHOTS, camAt, ShotDef } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const flagTex = () => ctex("usflag", 256, 160, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : "#b23b3b"; g.fillRect(0, i * (160 / 13), 256, 160 / 13 + 1); }
  g.fillStyle = "#2c3f73"; g.fillRect(0, 0, 110, 86);
  g.fillStyle = "#f7f4ee";
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(8 + c * 17, 8 + r * 15, 4, 4);
});

const grassMat = (key: string, rep: number) => {
  const map = grassHD().clone(); map.repeat.set(rep, rep); map.needsUpdate = true;
  return lam(key, () => ({ map }));
};
const paveMat = (key: string, rep: number) => {
  const map = cobbleHD().clone(); map.repeat.set(rep, rep); map.needsUpdate = true;
  return lam(key, () => ({ map }));
};

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private sets: Record<string, THREE.Group>;
  private missile: THREE.Group; private truck: THREE.Group; private trailer: THREE.Group;
  private electronics: THREE.Group; private bills: THREE.Group; private parcel: THREE.Group;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 16), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4, d = 640 + (i % 3) * 40;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 28;
      m.position.set(Math.cos(a) * d, 130 + (i % 4) * 30, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    const room = new THREE.Group(), hangar = new THREE.Group(), yard = new THREE.Group(), pentagon = new THREE.Group();
    this.sets = { room, hangar, yard, pentagon };
    R.add(room, hangar, yard, pentagon);
    this.buildRoom(room);
    this.buildHangar(hangar);
    this.missile = this.buildMissile();
    this.trailer = this.buildTrailer();
    this.truck = this.buildTruck();
    this.electronics = this.buildElectronics();
    yard.add(this.missile, this.trailer, this.truck, this.electronics);
    this.buildYard(yard);
    this.buildPentagon(pentagon);
    this.bills = new THREE.Group();
    this.parcel = new THREE.Group();
    room.add(this.bills);
    yard.add(this.parcel);
    this.dressBills();
    this.dressParcel();
  }

  private ground(parent: THREE.Object3D, key: string, x: number, z: number, w: number, d: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grassMat(key, Math.max(w, d) / 8));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; parent.add(m);
  }
  private tree(parent: THREE.Object3D, x: number, z: number, h: number, i: number) {
    const trunk = mesh(new THREE.CylinderGeometry(h * 0.06, h * 0.09, h * 0.42, 8), lam("bark" + (i % 2), () => ({ color: i % 2 ? "#8a5a3c" : "#7a4e34" })), x, h * 0.21, z, parent);
    trunk.castShadow = true;
    const crown = mesh(new THREE.SphereGeometry(h * 0.28, 14, 10), lam("leaf" + (i % 3), () => ({ color: ["#5aa83c", "#4c9a37", "#69b545"][i % 3] })), x, h * 0.55, z, parent);
    crown.scale.set(1.15, 0.9, 1.15);
  }

  private buildRoom(g: THREE.Group) {
    this.ground(g, "grassRoom", 0, 2, 40, 40);
    const wall = lam("roomWall", () => ({ color: "#e7d7c0" }));
    const floor = lam("roomFloor", () => ({ color: "#c4a574" }));
    const wood = lam("roomWood", () => ({ color: "#a87448" }));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 5.2), floor)).position.set(0, 0.04, 2.6);
    const back = mesh(new THREE.BoxGeometry(7, 2.8, 0.16), wall, 0, 1.4, 5.15, g);
    void back;
    mesh(new THREE.BoxGeometry(0.16, 2.8, 5.2), wall, -3.45, 1.4, 2.6, g);
    mesh(new THREE.BoxGeometry(0.16, 2.8, 5.2), wall, 3.45, 1.4, 2.6, g);
    // window on the right wall
    mesh(new THREE.BoxGeometry(0.08, 1.1, 1.4), lam("glass", () => ({ color: "#b7d4ea" })), 3.4, 1.55, 2.4, g);
    mesh(new THREE.BoxGeometry(1.7, 0.08, 0.8), wood, -0.15, 0.78, 3.15, g);
    mesh(new THREE.BoxGeometry(0.1, 0.74, 0.7), wood, -0.85, 0.37, 3.15, g);
    mesh(new THREE.BoxGeometry(0.1, 0.74, 0.7), wood, 0.55, 0.37, 3.15, g);
    const bezel = mesh(new THREE.BoxGeometry(0.9, 0.62, 0.08), lam("bezel", () => ({ color: "#2a2c32" })), -0.15, 1.22, 2.95, g);
    void bezel;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.46), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 1.75, 2.05) }));
    screen.position.set(-0.15, 1.22, 2.90); screen.layers.set(NOINK); g.add(screen);
    // gpu and radio junk
    mesh(new THREE.BoxGeometry(0.28, 0.05, 0.12), lam("gpu", () => ({ color: "#3cba62" })), 0.45, 0.86, 3.05, g);
    mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), lam("part1", () => ({ color: "#d2a24a" })), -0.7, 0.86, 3.35, g);
    mesh(new THREE.BoxGeometry(0.1, 0.06, 0.14), lam("part2", () => ({ color: "#4a6ea5" })), -0.45, 0.85, 3.4, g);
    mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), lam("chair", () => ({ color: "#6a5344" })), 0.35, 0.25, 2.0, g);
  }

  private dressBills() {
    const green = lam("bill", () => ({ color: "#7dbe78" }));
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.08), green);
      m.position.set(-0.35 + i * 0.02, 0.86 + i * 0.012, 2.85); m.rotation.y = 0.2; m.castShadow = true;
      this.bills.add(m);
    }
  }

  private buildHangar(g: THREE.Group) {
    this.ground(g, "grassHang", 0, HZ, 70, 70);
    const steel = lam("hangSteel", () => ({ color: "#8d9298" }));
    const dark = lam("hangDark", () => ({ color: "#5c6168" }));
    mesh(new THREE.BoxGeometry(16, 0.2, 22), paveMat("hangFloor", 4), 0, 0.1, HZ + 2, g);
    mesh(new THREE.BoxGeometry(16, 6, 0.3), steel, 0, 3, HZ + 12, g);
    mesh(new THREE.BoxGeometry(0.3, 6, 22), steel, -8, 3, HZ + 2, g);
    mesh(new THREE.BoxGeometry(0.3, 6, 22), steel, 8, 3, HZ + 2, g);
    mesh(new THREE.BoxGeometry(16.4, 0.25, 22.4), dark, 0, 6.1, HZ + 2, g);
    // innocent container
    const crate = lam("crate", () => ({ color: "#b7b3aa" }));
    const band = lam("crateBand", () => ({ color: "#6e736c" }));
    mesh(new THREE.BoxGeometry(1.7, 1.45, 2.6), crate, 0, 0.95, HZ + 2, g);
    mesh(new THREE.BoxGeometry(1.78, 0.12, 2.68), band, 0, 1.15, HZ + 2, g);
    mesh(new THREE.BoxGeometry(2.1, 0.12, 3.0), lam("pallet", () => ({ color: "#a56a3c" })), 0, 0.16, HZ + 2, g);
  }

  private buildMissile() {
    const g = new THREE.Group();
    const body = lam("mBody", () => ({ color: "#e4dcc8" }));
    const band = lam("mBand", () => ({ color: "#5d6844" }));
    const fin = lam("mFin", () => ({ color: "#2c3138" }));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 16), body);
    nose.rotation.z = -Math.PI / 2; nose.position.set(5.3, 0, 0); g.add(nose);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 9.2, 18), body);
    tube.rotation.z = Math.PI / 2; tube.position.set(0.2, 0, 0); g.add(tube);
    for (const x of [-1.2, 1.4, 3.2]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.28, 16), band);
      b.rotation.z = Math.PI / 2; b.position.set(x, 0, 0); g.add(b);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.06), fin);
      f.position.set(2.5, Math.sin(a) * 0.95, Math.cos(a) * 0.95);
      f.rotation.x = a;
      g.add(f);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const y = Math.sin(a) * 0.48, z = Math.cos(a) * 0.48;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.4, 10), lam("boost", () => ({ color: "#cfc6b2" })));
      b.rotation.z = Math.PI / 2; b.position.set(-5.1, y, z); g.add(b);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.45), fin);
      f.position.set(-5.6, y + Math.sin(a) * 0.35, z + Math.cos(a) * 0.35); g.add(f);
    }
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return g;
  }

  private buildTrailer() {
    const g = new THREE.Group();
    const iron = lam("trailer", () => ({ color: "#4a4e55" }));
    mesh(new THREE.BoxGeometry(8.5, 0.12, 1.3), iron, OX, 0.9, 5, g);
    mesh(new THREE.BoxGeometry(0.12, 0.75, 1.2), iron, OX - 3.6, 0.48, 5, g);
    mesh(new THREE.BoxGeometry(0.12, 0.75, 1.2), iron, OX + 3.2, 0.48, 5, g);
    const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12);
    for (const x of [-3.2, -1.2, 2.4, 3.6]) for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wheel, lam("tyre", () => ({ color: "#222428" })));
      w.rotation.z = Math.PI / 2; w.position.set(OX + x, 0.32, 5 + s * 0.75); w.castShadow = true; g.add(w);
    }
    return g;
  }

  private buildTruck() {
    const g = new THREE.Group();
    const cab = lam("cab", () => ({ color: "#c45a3a" }));
    const bed = lam("bedM", () => ({ color: "#6a6248" }));
    mesh(new THREE.BoxGeometry(2.4, 1.5, 2.1), cab, 0, 1.15, 0, g);
    mesh(new THREE.BoxGeometry(1.5, 0.7, 1.9), lam("cabWin", () => ({ color: "#9ec4de" })), 0.3, 1.7, 0, g);
    mesh(new THREE.BoxGeometry(7.2, 0.35, 2.3), bed, 4.6, 1.15, 0, g);
    const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12);
    for (const x of [0.2, 3.2, 6.2]) for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wheel, lam("tyre2", () => ({ color: "#1c1e22" })));
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, s * 1.15); w.castShadow = true; g.add(w);
    }
    g.position.set(OX + 16, 0, 14);
    return g;
  }

  private buildElectronics() {
    const g = new THREE.Group();
    const box = lam("ebox", () => ({ color: "#3f6b45" }));
    const dishM = lam("dish", () => ({ color: "#d5d8df" }));
    mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), box, OX - 4.4, 0.55, 6.3, g);
    mesh(new THREE.BoxGeometry(0.45, 0.28, 0.7), lam("ebox2", () => ({ color: "#2f6a62" })), OX - 5.2, 0.45, 6.05, g);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), dishM);
    dish.position.set(OX - 4.7, 1.35, 6.45); dish.castShadow = true; g.add(dish);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), lam("mast", () => ({ color: "#666a72" })), OX - 4.7, 0.9, 6.45, g);
    mesh(new THREE.BoxGeometry(0.9, 0.08, 0.5), lam("board", () => ({ color: "#2f8a4a" })), OX - 3.8, 0.95, 6.5, g);
    return g;
  }

  private buildYard(g: THREE.Group) {
    this.ground(g, "grassYard", OX, 8, 160, 140);
    const b = new Batch();
    house(b, OX, -8, 0, 11, 8, 7.2, 0);
    house(b, OX - 24, -10, 0.2, 8, 7, 6.4, 2);
    house(b, OX + 24, -9, -0.15, 9, 7, 8, 4);
    b.build(g);
    mesh(new THREE.BoxGeometry(4.5, 0.05, 10), paveMat("drive", 2), OX + 14, 0.04, 16, g);
    this.tree(g, OX - 16, 8, 5.5, 0);
    this.tree(g, OX + 16, 4, 6.2, 1);
    this.tree(g, OX - 18, -2, 4.8, 2);
    this.tree(g, OX + 18, 14, 5.2, 3);
    // mailbox, fully in the yard, not a clipped blob
    mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), lam("post", () => ({ color: "#6a5a48" })), OX - 8, 0.55, 8, g);
    mesh(new THREE.BoxGeometry(0.46, 0.32, 0.28), lam("mbox", () => ({ color: "#3a5f8a" })), OX - 8, 1.15, 8, g);
  }

  private dressParcel() {
    mesh(new THREE.BoxGeometry(0.42, 0.28, 0.36), lam("parcel", () => ({ color: "#c48a52" })), OX + 0.15, 0.16, -3.15, this.parcel);
    mesh(new THREE.BoxGeometry(0.44, 0.06, 0.08), lam("tape", () => ({ color: "#d8c39a" })), OX + 0.15, 0.32, -3.15, this.parcel);
  }

  private buildPentagon(g: THREE.Group) {
    this.ground(g, "grassPent", PX, 10, 90, 80);
    const stone = lam("pentStone", () => ({ color: "#d9d0c2" }));
    const bldg = new THREE.Mesh(new THREE.CylinderGeometry(15, 15.4, 8, 5), stone);
    bldg.position.set(PX, 4, 0); bldg.castShadow = true; bldg.receiveShadow = true; g.add(bldg);
    mesh(new THREE.BoxGeometry(3.2, 2.4, 0.35), lam("pentDoor", () => ({ color: "#3e4654" })), PX, 1.5, 14.8, g);
    for (const x of [-6, -2, 2, 6]) mesh(new THREE.BoxGeometry(1.6, 1.3, 0.25), lam("pentWin", () => ({ color: "#8eb4d2" })), PX + x, 4.6, 14.9, g);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: flagTex(), side: THREE.DoubleSide }));
    flag.position.set(PX + 10, 9.2, 16); g.add(flag);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 8, 6), lam("pole", () => ({ color: "#8a8680" })), PX + 4.6, 4, 12, g);
    mesh(new THREE.BoxGeometry(40, 0.08, 18), paveMat("plaza", 4), PX, 0.05, 18, g);
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
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    for (const [k, g] of Object.entries(this.sets)) g.visible = k === s.set;
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 80);
    if (s.light === "golden") Rr = Math.max(Rr, 28);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
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
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(18)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }

    // missile rests in the yard until the truck hauls it off
    this.trailer.visible = id === 6 || id === 7 || id === 8 || id === 11;
    this.electronics.visible = id === 8;
    this.bills.visible = id === 5;
    this.parcel.visible = id === 13 && t < 71.5;
    if (id === 12) {
      const u = Math.min(1, Math.max(0, (t - 62.2) / 4.6));
      this.truck.position.set(OX - 2 + u * 28, 0, 9);
      this.missile.position.set(this.truck.position.x + 4.4, 1.85, 9);
      this.missile.visible = t < 66.2;
      this.truck.visible = t < 66.2;
    } else if (id === 13) {
      this.truck.position.set(OX + 22, 0, 16);
      this.missile.position.set(OX + 26, 1.85, 16);
      this.truck.visible = t > 70.8;
      this.missile.visible = t > 70.8;
    } else {
      this.missile.position.set(OX, 1.55, 5);
      this.missile.visible = id >= 6 && id <= 11 && id !== 9 && id !== 10;
      this.truck.position.set(OX - 6, 0, 11);
      this.truck.visible = id === 11 || id === 6 || id === 7;
    }

    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
