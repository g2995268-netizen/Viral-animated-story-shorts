// Bunker, airlock, street and lab. Painted textures, merged static boxes, a few moving parts left loose.
import * as THREE from "three";
import { ctex, rep, brick, stoneHD } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";

const lam = (color: string, map: THREE.Texture | null = null) =>
  twoTone(new THREE.MeshLambertMaterial({ color, map }));

const metalTex = () => ctex("bkMetal", 512, 512, (g, r) => {
  g.fillStyle = "#8e949c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7; i++) {
    const y = 36 + i * 70;
    g.fillStyle = "rgba(30,28,34,0.45)"; g.fillRect(0, y, 512, 6);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, y + 6, 512, 2);
    for (let k = 0; k < 6; k++) {
      g.fillStyle = "#5c6168"; g.beginPath(); g.arc(40 + k * 86, y + 18, 7, 0, 6.3); g.fill();
      g.fillStyle = "#c5ccd2"; g.beginPath(); g.arc(40 + k * 86, y + 18, 3, 0, 6.3); g.fill();
    }
  }
  for (let n = 0; n < 40; n++) {
    g.strokeStyle = `rgba(40,36,32,${0.15 + r() * 0.25})`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(r() * 512, r() * 512); g.lineTo(r() * 512, r() * 512); g.stroke();
  }
});
const floorTex = () => ctex("bkFloor", 512, 512, (g) => {
  g.fillStyle = "#5e636b"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(20,18,22,0.7)"; g.lineWidth = 8;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  g.fillStyle = "#c9a227"; g.fillRect(0, 236, 512, 40);
  g.fillStyle = "#1c1c1c"; for (let i = 0; i < 8; i++) g.fillRect(i * 64, 244, 32, 24);
});
const cautionTex = () => ctex("bkCaution", 256, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#1a1a1a" : "#e6b325"; g.fillRect(i * 32, 0, 32, 64); }
});
const crateTex = () => ctex("bkCrate", 256, 256, (g, r) => {
  g.fillStyle = "#a56b3c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#6b4224"; g.lineWidth = 10;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 20 + i * 48); g.lineTo(256, 20 + i * 48); g.stroke(); }
  g.strokeStyle = "#4a2e18"; g.lineWidth = 14; g.strokeRect(8, 8, 240, 240);
  g.fillStyle = "rgba(80,40,20,0.25)"; for (let n = 0; n < 20; n++) g.fillRect(r() * 240, r() * 240, 8, 30);
});
const bunkTex = () => ctex("bkBunk", 256, 128, (g) => {
  g.fillStyle = "#6d3a3e"; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = "rgba(40,16,18,0.45)"; g.lineWidth = 4;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 16); g.lineTo(256, i * 16 + 8); g.stroke(); }
});
const facadeTex = () => ctex("bkFacade", 1024, 1024, (g) => {
  g.fillStyle = "#e6d3b4"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#c9b497"; g.fillRect(0, 0, 1024, 46); g.fillRect(0, 960, 1024, 64);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const x = 70 + col * 250, y = 90 + row * 175;
    g.fillStyle = "#8fd0ea"; g.fillRect(x, y, 150, 110);
    g.strokeStyle = "#3a342c"; g.lineWidth = 10; g.strokeRect(x, y, 150, 110);
    g.beginPath(); g.moveTo(x + 75, y); g.lineTo(x + 75, y + 110); g.moveTo(x, y + 55); g.lineTo(x + 150, y + 55); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 8, y + 8, 40, 70);
  }
});
const facade2 = () => ctex("bkFacade2", 1024, 1024, (g) => {
  g.fillStyle = "#d7c4b8"; g.fillRect(0, 0, 1024, 1024);
  const b = brick();
  g.drawImage(b.image as CanvasImageSource, 0, 820, 1024, 204);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const x = 40 + col * 200, y = 80 + row * 180;
    g.fillStyle = "#6aa8c8"; g.fillRect(x, y, 120, 130);
    g.strokeStyle = "#2c2824"; g.lineWidth = 8; g.strokeRect(x, y, 120, 130);
  }
});
const roadTex = () => ctex("bkRoad", 512, 512, (g) => {
  g.fillStyle = "#3a3d44"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#f2f2ea"; g.fillRect(0, 240, 512, 18);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.01})`; g.fillRect(i * 3, (i * 37) % 512, 40, 2); }
});
const walkTex = () => ctex("bkWalk", 512, 512, (g) => {
  g.fillStyle = "#c8bfb2"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(80,70,60,0.55)"; g.lineWidth = 6;
  for (let i = 0; i <= 4; i++) { g.strokeRect(i * 128 + 8, 8, 112, 496); }
});
const tileTex = () => ctex("bkTile", 512, 512, (g) => {
  g.fillStyle = "#e7e4de"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(90,90,96,0.45)"; g.lineWidth = 6;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
const labWall = () => ctex("bkLab", 512, 512, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#d9d3c8"; g.fillRect(0, 470, 512, 42);
  g.strokeStyle = "rgba(80,80,90,0.18)"; g.strokeRect(20, 20, 472, 430);
});
const glassTex = () => ctex("bkGlass", 128, 128, (g) => {
  const gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, "rgba(190,220,235,0.45)"); gr.addColorStop(1, "rgba(120,160,190,0.2)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 110); g.lineTo(50, 20); g.stroke();
});

const M = {
  metal: () => lam("#9aa1a8", rep(metalTex(), 2, 1)),
  floor: () => lam("#6a7078", rep(floorTex(), 4, 4)),
  caution: () => lam("#ffffff", rep(cautionTex(), 8, 1)),
  crate: () => lam("#ffffff", crateTex()),
  bunk: () => lam("#ffffff", bunkTex()),
  dark: () => lam("#2c3138"),
  pipe: () => lam("#6a727c"),
  red: () => lam("#8a3030"),
  facade: () => lam("#ffffff", facadeTex()),
  facadeB: () => lam("#ffffff", facade2()),
  road: () => lam("#ffffff", rep(roadTex(), 1, 6)),
  walk: () => lam("#ffffff", rep(walkTex(), 2, 4)),
  stone: () => lam("#ffffff", rep(stoneHD("bkStone"), 2, 1)),
  tile: () => lam("#ffffff", rep(tileTex(), 3, 3)),
  lab: () => lam("#ffffff", labWall()),
  wood: () => lam("#8d6a45"),
  white: () => lam("#f7f5f0"),
  green: () => lam("#3e8a45"),
  leaf: () => lam("#4f9a48"),
  trunk: () => lam("#6b4a32"),
  car: (c: string) => lam(c),
};

const box = (g: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const cyl = (g: THREE.Object3D, rt: number, rb: number, h: number, mat: THREE.Material, x: number, y: number, z: number, axis: "y" | "x" | "z" = "y") => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), mat);
  m.position.set(x, y, z);
  if (axis === "x") m.rotation.z = Math.PI / 2;
  if (axis === "z") m.rotation.x = Math.PI / 2;
  m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};

export type Rooms = {
  hall: THREE.Group; lock: THREE.Group; street: THREE.Group; lab: THREE.Group;
  innerDoor: THREE.Group; outerDoor: THREE.Group; cars: THREE.Group[];
  screen: THREE.Mesh; consoleGlow: THREE.Mesh; airDisp: THREE.Mesh; paper: THREE.Mesh; button: THREE.Mesh;
  lamps: THREE.Mesh[]; fans: THREE.Mesh[];
};

const signCanvas = (lines: string[], bg: string, fg: string, w = 512, h = 256) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = fg; g.font = `700 ${Math.floor(h / (lines.length + 1.2))}px "DejaVu Sans", "Noto Sans", sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((t, i) => g.fillText(t, w / 2, ((i + 1) * h) / (lines.length + 1)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

export const buildRooms = (): Rooms => {
  const hall = new THREE.Group();
  const lock = new THREE.Group();
  const street = new THREE.Group();
  const lab = new THREE.Group();
  const metal = M.metal(), floor = M.floor(), pipe = M.pipe(), dark = M.dark(), crate = M.crate(), bunk = M.bunk();

  // hall shell
  box(hall, 14.6, 0.2, 18.2, floor, 0, -0.1, 0.8);
  box(hall, 0.35, 4.1, 18.2, metal, -7.3, 2.05, 0.8);
  box(hall, 0.35, 4.1, 18.2, metal, 7.3, 2.05, 0.8);
  box(hall, 14.6, 4.1, 0.35, metal, 0, 2.05, 9.7);
  box(hall, 14.6, 0.25, 18.2, metal, 0, 4.15, 0.8);
  // door wall with a hole implied by a frame (the opening is the missing centre — we build two jambs + lintel)
  box(hall, 5.2, 4.1, 0.35, metal, -4.6, 2.05, -8.2);
  box(hall, 5.2, 4.1, 0.35, metal, 4.6, 2.05, -8.2);
  box(hall, 4.2, 1.15, 0.35, metal, 0, 3.55, -8.2);
  box(hall, 14.4, 0.08, 0.5, M.caution(), 0, 0.04, -7.7);

  // ribs, pipes, bunks, crates, tanks, lockers, benches
  for (const x of [-6.9, 6.9]) {
    cyl(hall, 0.12, 0.12, 17, pipe, x, 3.55, 0.8, "z");
    cyl(hall, 0.08, 0.08, 17, pipe, x, 3.2, 0.8, "z");
    for (const z of [-4, -1, 2, 5]) box(hall, 0.7, 1.7, 0.9, bunk, x > 0 ? 6.5 : -6.5, 0.85, z);
    for (const z of [-2.2, 3.2]) box(hall, 0.7, 0.55, 0.9, bunk, x > 0 ? 6.5 : -6.5, 1.85, z);
  }
  for (let i = 0; i < 6; i++) box(hall, 0.7, 0.55 + (i % 3) * 0.15, 0.7, crate, -5.6 + (i % 3) * 0.8, 0.35, 7.4 - Math.floor(i / 3) * 0.8);
  cyl(hall, 0.45, 0.45, 1.1, M.red(), 5.8, 0.55, 6.6);
  cyl(hall, 0.45, 0.45, 1.1, dark, 5.8, 0.55, 7.6);
  for (const z of [-5, -3.2]) box(hall, 0.55, 1.8, 0.9, dark, -6.5, 0.9, z);
  box(hall, 2.2, 0.45, 0.7, dark, -3.5, 0.4, 6.8);
  box(hall, 1.6, 0.9, 0.7, dark, 0, 0.45, 8.55); // console
  // pillars
  for (const [x, z] of [[-4.5, -2], [4.5, -2], [-4.5, 4], [4.5, 4]] as const) box(hall, 0.35, 4, 0.35, metal, x, 2, z);
  // ceiling beams
  for (const z of [-5, -1, 3, 7]) box(hall, 14, 0.18, 0.28, dark, 0, 3.95, z);
  // hanging cables
  for (const x of [-2, 0.5, 3]) cyl(hall, 0.03, 0.03, 1.1, dark, x, 3.4, 2);

  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.15) });
  const lamps: THREE.Mesh[] = [];
  for (const [x, z] of [[-3, -4], [3, -4], [-3, 2], [3, 2], [-3, 6], [3, 6], [0, 0], [0, 5]] as const) {
    const m = cyl(hall, 0.18, 0.18, 0.12, lampMat, x, 3.85, z);
    m.castShadow = false; lamps.push(m);
    cyl(hall, 0.06, 0.22, 0.28, dark, x, 3.65, z);
  }
  const fans: THREE.Mesh[] = [];
  for (const z of [-3, 4]) {
    const fan = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.16), dark);
    fan.position.set(0, 3.7, z); hall.add(fan); fans.push(fan);
  }

  // screen
  const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), screenMat);
  screen.position.set(0, 2.25, 9.46); screen.rotation.y = Math.PI; hall.add(screen);
  box(hall, 3.7, 2.2, 0.12, dark, 0, 2.25, 9.58);
  const consoleGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 0.5) }));
  consoleGlow.position.set(0, 0.95, 8.18); consoleGlow.rotation.x = -0.6; hall.add(consoleGlow);
  const shelter = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.MeshBasicMaterial({ map: signCanvas(["УБЕЖИЩЕ  №7"], "#1a1c22", "#f2efe6", 640, 160) }));
  shelter.position.set(0, 3.15, -8.0); hall.add(shelter);

  // inner blast door, hinged on +x of the opening
  const innerDoor = new THREE.Group();
  innerDoor.position.set(1.9, 0, -8.2);
  box(innerDoor, 0.28, 2.9, 0.16, metal, -3.5, 1.5, 0);
  box(innerDoor, 0.22, 2.9, 0.14, metal, 0, 1.5, 0);
  box(innerDoor, 3.6, 0.28, 0.16, metal, -1.75, 2.85, 0);
  box(innerDoor, 3.6, 0.4, 0.16, metal, -1.75, 0.25, 0);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  pane.position.set(-1.75, 1.55, 0); pane.layers.set(NOINK); innerDoor.add(pane);
  const wheel = cyl(innerDoor, 0.26, 0.26, 0.08, M.red(), -0.7, 1.35, 0.12, "z");
  wheel.rotation.x = Math.PI / 2;
  hall.add(innerDoor);

  // airlock
  box(lock, 3.6, 0.16, 5.2, floor, 0, -0.08, -10.9);
  box(lock, 0.28, 3.3, 5.2, metal, -1.85, 1.65, -10.9);
  box(lock, 0.28, 3.3, 5.2, metal, 1.85, 1.65, -10.9);
  box(lock, 3.6, 0.2, 5.2, metal, 0, 3.3, -10.9);
  box(lock, 3.4, 0.08, 0.4, M.caution(), 0, 0.04, -12.6);
  cyl(lock, 0.08, 0.08, 4.6, pipe, -1.55, 2.6, -10.9, "z");
  cyl(lock, 0.08, 0.08, 4.6, pipe, 1.55, 2.4, -10.9, "z");
  const airDisp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.3, 0.25) }));
  airDisp.position.set(0, 2.35, -13.05); lock.add(airDisp);
  box(lock, 1.3, 0.7, 0.08, dark, 0, 2.35, -13.15);
  // outer door
  const outerDoor = new THREE.Group();
  outerDoor.position.set(1.55, 0, -13.35);
  box(outerDoor, 3.0, 2.8, 0.16, metal, -1.5, 1.45, 0);
  box(outerDoor, 2.6, 0.18, 0.04, M.caution(), -1.5, 0.4, 0.1);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshBasicMaterial({ map: signCanvas(["ВНЕШНИЙ ВЫХОД"], "#7a1e1e", "#fff4e8", 640, 140) }));
  exitSign.position.set(-1.5, 2.45, 0.12); outerDoor.add(exitSign);
  lock.add(outerDoor);
  // glass of the inner window is on the door; a second pane stays in the wall so the crowd reads through it
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.05), new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, opacity: 0.35, depthWrite: false }));
  win.position.set(0, 1.7, -8.05); lock.add(win);

  // street
  box(street, 28, 0.2, 40, M.road(), 6, -0.1, 0);
  box(street, 6, 0.22, 40, M.walk(), -1.2, -0.02, 0);
  box(street, 0.4, 0.15, 8, lam("#f4f4ee"), 2.3, 0.08, 0); // crossing
  // buildings
  box(street, 8, 11, 16, M.facade(), -6.2, 5.5, -2);
  box(street, 7, 8.5, 14, M.facadeB(), -5.6, 4.25, 16);
  box(street, 6, 9, 18, M.facade(), 14, 4.5, 2);
  box(street, 10, 0.4, 16, M.stone(), -6.2, 11.2, -2); // cornice
  // big glass of the lab, set into the near building face (x = -2.15)
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.4), new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, opacity: 0.45, depthWrite: false }));
  winGlass.position.set(-2.18, 1.7, 0); winGlass.rotation.y = Math.PI / 2; street.add(winGlass);
  box(street, 0.12, 2.7, 0.12, dark, -2.2, 1.7, -2.4);
  box(street, 0.12, 2.7, 0.12, dark, -2.2, 1.7, 2.4);
  box(street, 0.12, 0.12, 4.9, dark, -2.2, 2.95, 0);
  // trees, lamps, bins
  for (const z of [-8, -3, 4, 9, 14]) {
    cyl(street, 0.18, 0.22, 1.4, M.trunk(), -2.8, 0.7, z);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), M.leaf());
    crown.position.set(-2.8, 2.1, z); crown.castShadow = true; street.add(crown);
    cyl(street, 0.08, 0.08, 3.2, dark, 1.6, 1.6, z + 1.5);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 0.8) }));
    head.position.set(1.6, 3.2, z + 1.5); street.add(head);
  }
  box(street, 0.5, 0.7, 0.5, dark, 0.4, 0.35, 3.5);
  box(street, 1.4, 1.5, 0.4, M.facade(), 0.2, 1.3, 6.5); // bus shelter

  const cars: THREE.Group[] = [];
  const cols = ["#d64545", "#2f6fbf", "#f0f2f4", "#e0a030", "#3c8c4e"];
  cols.forEach((c, i) => {
    const car = new THREE.Group();
    box(car, 1.8, 0.55, 4.0, M.car(c), 0, 0.55, 0);
    box(car, 1.5, 0.5, 2.0, lam("#d5e7f2"), 0, 1.0, -0.1);
    for (const [x, z] of [[-0.75, -1.3], [0.75, -1.3], [-0.75, 1.3], [0.75, 1.3]] as const)
      cyl(car, 0.28, 0.28, 0.18, dark, x, 0.28, z, "x");
    car.userData.lane = i % 2 ? 4.2 : 7.2;
    car.userData.z0 = -16 + i * 7;
    car.userData.speed = 3.2 + (i % 3) * 0.8;
    car.userData.flip = i % 2;
    cars.push(car); street.add(car);
  });

  // lab interior, behind the glass (x < -2.2)
  box(lab, 6.5, 0.12, 7, M.tile(), -5.2, 0, 0);
  box(lab, 0.2, 3.2, 7, M.lab(), -8.3, 1.6, 0);
  box(lab, 6.5, 3.2, 0.2, M.lab(), -5.2, 1.6, -3.4);
  box(lab, 6.5, 3.2, 0.2, M.lab(), -5.2, 1.6, 3.4);
  box(lab, 6.5, 0.15, 7, M.lab(), -5.2, 3.2, 0);
  box(lab, 2.4, 0.08, 1.1, M.wood(), -4.3, 0.78, 0.2); // desk
  box(lab, 0.1, 0.74, 1.0, M.wood(), -5.4, 0.37, 0.2);
  box(lab, 0.1, 0.74, 1.0, M.wood(), -3.2, 0.37, 0.2);
  // monitors
  for (const x of [-4.9, -4.3, -3.7]) {
    box(lab, 0.5, 0.36, 0.06, dark, x, 1.15, -0.15);
  }
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.4, 0.35) }));
  mon.position.set(-4.3, 1.16, -0.1); lab.add(mon);
  box(lab, 0.35, 0.5, 0.35, M.white(), -3.5, 0.25, 1.1); // chair-ish
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshBasicMaterial({ color: "#fff" }));
  paper.position.set(-4.15, 0.84, 0.35); paper.rotation.x = -Math.PI / 2; lab.add(paper);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.15, 0.12) }));
  button.position.set(-3.55, 0.86, -0.15); lab.add(button);
  box(lab, 0.28, 0.06, 0.28, dark, -3.55, 0.82, -0.15);
  // wall title
  const title = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.4), new THREE.MeshBasicMaterial({ map: signCanvas(["ЭКСПЕРИМЕНТ  «101»"], "#f4f1ea", "#2a2428", 800, 140) }));
  title.position.set(-8.15, 2.4, 0); title.rotation.y = Math.PI / 2; lab.add(title);
  // ceiling strips
  for (const z of [-1.2, 1.2]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.25), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.45) }));
    strip.position.set(-5.2, 3.1, z); lab.add(strip);
  }
  box(lab, 0.4, 1.1, 0.8, M.white(), -7.6, 0.55, 2.4); // cabinet
  cyl(lab, 0.06, 0.07, 0.16, lam("#c0392b"), -4.7, 0.9, 0.55); // mug

  return { hall, lock, street, lab, innerDoor, outerDoor, cars, screen, consoleGlow, airDisp, paper, button, lamps, fans };
};

export const paintMonitor = (mode: string, f: number) => {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 576;
  const g = c.getContext("2d")!;
  const alert = ["alert", "deny", "extra", "seats", "people"].includes(mode);
  g.fillStyle = alert ? "#24080c" : "#07140e"; g.fillRect(0, 0, 1024, 576);
  g.fillStyle = alert ? "rgba(255,80,70,0.06)" : "rgba(80,255,160,0.05)";
  for (let y = 0; y < 576; y += 4) g.fillRect(0, y, 1024, 1);
  const fg = alert ? "#ff5a56" : "#7dffb0";
  g.fillStyle = fg; g.textAlign = "center";
  g.font = "700 40px 'DejaVu Sans Mono', 'Noto Sans Mono', monospace";
  g.fillText("КОВЧЕГ  //  УБЕЖИЩЕ 07", 512, 64);
  g.font = "700 26px 'DejaVu Sans Mono', monospace";
  const tick = Math.floor(f / 8) % 2 ? "▮" : " ";
  const lines: Record<string, string[]> = {
    logo: ["СИСТЕМА В СТРОЮ", "100 МЕСТ  ·  НАБОР ЗАКРЫТ", "СИРЕНЫ СНАРУЖИ"],
    full: ["МЕСТ:  100", "ЗАНЯТО:  100", "СТАТУС:  ВСЕ ЗАНЯТЫ"],
    alert: ["ВНИМАНИЕ", "ОБНАРУЖЕНО:  101", "МЕСТ:  100"],
    ok: ["ПРОВЕРКА ПРОПУСКОВ", "100 / 100", "ВСЕ ДЕЙСТВИТЕЛЬНЫ"],
    timer: ["ТАЙМЕР ВЫХОДА", `04:${String(54 - (f % 50)).padStart(2, "0")}`, "ЛИШНИЙ ДОЛЖЕН УЙТИ"],
    still: ["ЛЮДЕЙ В ЗАЛЕ:  100", "ДАТЧИК:  101", "РАСХОЖДЕНИЕ"],
    term: ["> OPEN /SYS/HEADCOUNT", "> READ ........ " + tick, "> ОТВЕТ НИЖЕ"],
    deny: ["ДОСТУП ЗАПРЕЩЁН", "ДАННЫЕ СИСТЕМЫ", "КОД  403"],
    extra: ["ВНИМАНИЕ", "ОБНАРУЖЕН ЛИШНИЙ", "ПОВТОР ПРОТОКОЛА"],
    seats: ["МЕСТ  —  99", "ПЕРЕПИСЬ МЕСТ", ""],
    people: ["МЕСТ  —  99", "ЛЮДЕЙ  —  100", "ЛИШНИЙ ВНУТРИ"],
  };
  g.font = mode === "alert" || mode === "deny" || mode === "seats" || mode === "people" ? "800 72px 'DejaVu Sans', sans-serif" : "700 58px 'DejaVu Sans', sans-serif";
  g.textAlign = "center";
  (lines[mode] ?? lines.logo).forEach((t, i) => g.fillText(t, 512, 190 + i * 100));
  // indicator dots
  for (let i = 0; i < 8; i++) {
    g.fillStyle = !alert && i < 6 ? "#2ee58a" : "#ff4d4d";
    g.beginPath(); g.arc(70 + i * 36, 530, 10, 0, 6.3); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};

export const paintAir = (sec: number) => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 220;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1a0608"; g.fillRect(0, 0, 512, 220);
  g.fillStyle = "#ff5a4a"; g.font = "700 36px 'DejaVu Sans', sans-serif";
  g.textAlign = "center"; g.fillText("КИСЛОРОД", 256, 70);
  g.font = "800 92px 'DejaVu Sans Mono', monospace";
  g.fillText(sec <= 0 ? "00:00" : `00:${String(sec).padStart(2, "0")}`, 256, 170);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export const paintPaper = () => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 680;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 512, 680);
  g.strokeStyle = "#e2d3b8"; g.lineWidth = 2;
  for (let y = 120; y < 640; y += 36) { g.beginPath(); g.moveTo(36, y); g.lineTo(480, y); g.stroke(); }
  g.fillStyle = "#7a1d22"; g.font = "800 40px 'DejaVu Sans', sans-serif";
  g.textAlign = "center"; g.fillText("ЭКСПЕРИМЕНТ «101»", 256, 80);
  g.font = "700 28px 'DejaVu Sans', sans-serif"; g.fillStyle = "#2a2428"; g.textAlign = "left";
  const lines = ["ГРУППА №1  ·  100 ЧЕЛ.", "", "ПЕРВОГО ЧЕЛОВЕКА", "ИЗГНАЛИ ЗА 9 МИНУТ.", "", "Протокол повторить."];
  lines.forEach((t, i) => g.fillText(t, 40, 180 + i * 64));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export const paintFeed = () => {
  const c = document.createElement("canvas"); c.width = 320; c.height = 200;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3a1418"; g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#f2c14e"; for (let i = 0; i < 12; i++) g.fillRect(20 + (i % 6) * 48, 40 + Math.floor(i / 6) * 50, 16, 28);
  g.fillStyle = "#ffd0cc"; g.font = "700 22px 'DejaVu Sans Mono', monospace"; g.fillText("CAM 07  LIVE", 16, 24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
