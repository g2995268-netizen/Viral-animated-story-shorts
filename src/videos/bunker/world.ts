// One three.js place: bunker hall, airlock, the street outside, and the lab behind the glass.
// update() is a pure function of shot id + frame.
import * as THREE from "three";
import { NOINK } from "./ink";
import { TONE, CHAR } from "./shade";
import { untone } from "./shade";
import { LIGHTS, LOOK, LightName } from "./lights";
import { SHOTS, camAt, monitorOf, oxygenLeft, FPS } from "./story";
import { buildRooms, paintMonitor, paintAir, paintPaper, paintFeed, Rooms } from "./build";
import { Pool, Actor, poseCast, focusOf } from "./cast";
import { cloudHD } from "./paint";

export class World {
  root = new THREE.Group();
  private rooms: Rooms;
  private pool = new Pool();
  private actors: Actor[] = [];
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#4a2030", 6, 26);
  private sunCache = new Map<number, THREE.Vector3>();
  private monMode = "";
  private monTex: THREE.CanvasTexture | null = null;
  private airSec = -1;
  private paperDone = false;
  private feedDone = false;
  private clouds: THREE.Mesh[] = [];
  private tmp = new THREE.Vector3();
  private right = new THREE.Vector3();

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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), this.skyMat);
    this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.4);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.4);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.rooms = buildRooms();
    R.add(this.rooms.hall, this.rooms.lock, this.rooms.street, this.rooms.lab);
    for (const m of this.rooms.lamps) m.layers.set(NOINK);
    this.rooms.screen.layers.set(NOINK);
    this.rooms.consoleGlow.layers.set(NOINK);
    this.rooms.airDisp.layers.set(NOINK);
    this.rooms.paper.layers.set(NOINK);
    this.rooms.button.layers.set(NOINK);
    for (let i = 0; i < 6; i++) {
      const map = cloudHD(i, LOOK.day.cloud);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false }));
      const a = (i / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * 40, 14 + (i % 3) * 3, Math.sin(a) * 40);
      c.scale.set(16, 7, 1); c.layers.set(NOINK); this.clouds.push(c); R.add(c);
    }
    for (let i = 0; i < 28; i++) this.actors.push(new Actor(R));
  }

  private shotSun(id: number, light: LightName) {
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1];
    const L = LIGHTS[light];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 4) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v); return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = SHOTS[id - 1];
    const L = LIGHTS[s.light];
    const K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = focusOf(id, f);
    const sunDir = this.shotSun(id, s.light);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const dist = cam.position.distanceTo(focus);
    const Rr = THREE.MathUtils.clamp(dist * 1.3 + 6, 8, 28);
    this.sun.position.copy(focus).addScaledVector(sunDir, 40);
    this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 2; sc.far = 80; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((hex, i) => untone(hex, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const outside = s.set === "street" || s.set === "lab" || id >= 25;
    for (const cl of this.clouds) {
      cl.visible = outside;
      cl.lookAt(cam.position.x, cl.position.y, cam.position.z);
    }

    const showHall = s.set === "hall" || s.set === "lock";
    this.rooms.hall.visible = showHall;
    this.rooms.lock.visible = showHall;
    this.rooms.street.visible = s.set === "street" || s.set === "lab";
    this.rooms.lab.visible = s.set === "street" || s.set === "lab";

    // doors: slam shut after the run-in, outer hatch opens on shot 25
    const shut = id === 1 ? Math.min(1, Math.max(0, (f - s.a - 40) / 28)) : 1;
    this.rooms.innerDoor.rotation.y = (1 - shut) * 1.15;
    const open = id < 25 ? 0 : id === 25 ? Math.min(1, (f - s.a) / 18) : 1;
    this.rooms.outerDoor.rotation.y = -open * 1.7;

    const pulse = 0.65 + 0.35 * Math.sin(f * 0.45);
    const lampCol = this.rooms.lamps[0]?.material as THREE.MeshBasicMaterial;
    if (lampCol) lampCol.color.setRGB(2.6 * pulse, 0.22 * pulse, 0.12);
    for (const fan of this.rooms.fans) fan.rotation.y = f * 0.35;

    const mode = monitorOf(id);
    if (mode !== this.monMode || f % 10 === 0) {
      this.monMode = mode;
      const tex = paintMonitor(mode, f);
      (this.rooms.screen.material as THREE.MeshBasicMaterial).map = tex;
      (this.rooms.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
      this.monTex?.dispose(); this.monTex = tex;
    }
    const sec = oxygenLeft(id, f);
    if (sec !== null && sec !== this.airSec) {
      this.airSec = sec;
      const tex = paintAir(sec);
      (this.rooms.airDisp.material as THREE.MeshBasicMaterial).map = tex;
      (this.rooms.airDisp.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    if (!this.paperDone) {
      this.paperDone = true;
      (this.rooms.paper.material as THREE.MeshBasicMaterial).map = paintPaper();
      (this.rooms.paper.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    if (!this.feedDone) {
      this.feedDone = true;
      const mats = this.rooms.lab.children;
      // the three dark monitor boxes stay; the glowing plane already has a color. Stamp the feed on it.
      (this.rooms.lab.children.find((o) => o instanceof THREE.Mesh && (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry && o.position.y > 1 && o.position.y < 1.3) as THREE.Mesh | undefined);
      void mats;
      const feed = this.rooms.lab.children.find((o) => o.position.y === 1.16) as THREE.Mesh | undefined;
      if (feed) { (feed.material as THREE.MeshBasicMaterial).map = paintFeed(); (feed.material as THREE.MeshBasicMaterial).needsUpdate = true; }
    }
    // button press on shot 32
    if (id === 32) {
      const u = Math.min(1, Math.max(0, (f - s.a - 24) / 8));
      this.rooms.button.position.y = 0.86 - u * 0.03;
    } else this.rooms.button.position.y = 0.86;

    const t = f / FPS;
    for (const car of this.rooms.cars) {
      const span = 36;
      let z = (car.userData.z0 + t * car.userData.speed * (car.userData.flip ? -1 : 1)) % span;
      if (z > 18) z -= span;
      if (z < -18) z += span;
      car.position.set(car.userData.lane, 0, z);
      car.rotation.y = car.userData.flip ? Math.PI : 0;
    }

    cam.updateMatrixWorld();
    this.tmp.set(0, 1, 0);
    this.right.crossVectors(this.tmp, cam.getWorldDirection(this.tmp.clone())).normalize();
    // cross(up, forward) is left in camera space... Plane faces +Z toward camera via atan2(dx,dz).
    // For the painted light we want screen-right. three camera right is cross(forward, up).
    const fwd = cam.getWorldDirection(new THREE.Vector3());
    this.right.crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    poseCast(this.pool, this.actors, { id, f, camPos: cam.position, camRight: this.right, sun: sunDir });
    return focus;
  }
}
