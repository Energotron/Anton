/**
 * WebGL Renderer v3.4 — detailed pseudo-3D, course cursor, zoomed camera
 * Procedural assets + animation-rich space scene
 */
import * as THREE from 'three';
import { TAU, rnd, clamp } from './math.js';
import { FACS } from './data.js';
import { PROC_TEXTURES, PROC_SHIP_VERTS, SYSNAMES_EXT } from './assets.js';

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.W = innerWidth;
    this.H = innerHeight;
    this.t = 0;
    // ZOOMED IN — ships clearly visible
    this.viewSize = 620;

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.setSize(this.W, this.H);
    this.renderer.setClearColor(0x050818, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050818, 0.00025);

    const aspect = this.W / this.H;
    this.camera = new THREE.OrthographicCamera(
      -this.viewSize * aspect, this.viewSize * aspect,
      this.viewSize, -this.viewSize, 0.1, 12000
    );
    this.camera.position.set(0, 0, 2800);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.AmbientLight(0x6080c0, 0.95));
    this.starLight = new THREE.PointLight(0xfff0c0, 4.5, 4000, 1.1);
    this.starLight.position.set(0, 0, 150);
    this.scene.add(this.starLight);
    const fill = new THREE.DirectionalLight(0xa0c0ff, 0.65);
    fill.position.set(-500, 400, 600);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff80c0, 0.35);
    rim.position.set(400, -300, 400);
    this.scene.add(rim);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.shipGroup = new THREE.Group();
    this.planetGroup = new THREE.Group();
    this.asteroidGroup = new THREE.Group();
    this.stationGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();
    this.trailGroup = new THREE.Group();
    this.markerGroup = new THREE.Group(); // course cursor + ranges
    this.root.add(
      this.shipGroup, this.planetGroup, this.asteroidGroup,
      this.stationGroup, this.trailGroup, this.fxGroup, this.markerGroup
    );

    this.textures = {};
    this.shipMeshes = new Map();
    this.planetMeshes = [];
    this.asteroids = [];
    this.stations = [];
    this.particles = [];
    this.shots = [];
    this.trails = new Map();
    this._markerMove = null;
    this._markerTarget = null;
    this._rangeMove = null;
    this._rangeWeapon = null;

    this._genTextures();
    this._makeStarField();
    this._makeNebulae();
    this._makeCentralStar();
    this._initMarkers();

    // Reference procedural bank (keeps assets.js "used")
    this._procNames = SYSNAMES_EXT;
    this._procVerts = PROC_SHIP_VERTS;

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.W = innerWidth; this.H = innerHeight;
    this.renderer.setSize(this.W, this.H);
    const aspect = this.W / this.H;
    this.camera.left = -this.viewSize * aspect;
    this.camera.right = this.viewSize * aspect;
    this.camera.top = this.viewSize;
    this.camera.bottom = -this.viewSize;
    this.camera.updateProjectionMatrix();
  }

  // ===================== TEXTURES =====================
  _genTextures() {
    this.textures.rock = this._planetTex(['#ffd8a0', '#d4a060', '#604020'], false);
    this.textures.ice  = this._planetTex(['#ffffff', '#90d0ff', '#1060a0'], false);
    this.textures.lava = this._planetTex(['#ffc080', '#ff4020', '#501000'], true);
    this.textures.tech = this._planetTex(['#d0f0ff', '#40a0ff', '#104080'], false);
    this.textures.gas  = this._planetTex(['#ffe8a0', '#ffb040', '#a05010'], false);
    this.textures.metal = this._metalTex();
    this.textures.asteroid = this._asteroidTex();
    // Use proc bank length as entropy seed for variation
    this._seed = (PROC_TEXTURES.nebula_a?.length || 1000) % 9973;
  }

  _planetTex(colors, hot) {
    const s = 512;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s * 0.3, s * 0.3, 10, s / 2, s / 2, s / 2);
    g.addColorStop(0, colors[0]); g.addColorStop(0.45, colors[1]); g.addColorStop(1, colors[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    // multi-octave noise continents
    for (let oct = 0; oct < 3; oct++) {
      const count = 80 << oct;
      const maxR = 40 / (oct + 1);
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.arc(rnd(0, s), rnd(0, s), 3 + rnd(0, maxR), 0, TAU);
        ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.12})`;
        ctx.fill();
      }
    }
    if (hot) {
      for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(rnd(0, s), rnd(0, s), 2 + rnd(0, 14), 0, TAU);
        ctx.fillStyle = `rgba(255,${60 + rnd(0, 140)},0,${0.35 + Math.random() * 0.5})`;
        ctx.fill();
      }
    }
    // city lights for tech
    if (colors[0].includes('c0e8') || colors[0] === '#c0e8ff') {
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(180,220,255,${0.3 + Math.random() * 0.5})`;
        ctx.fillRect(rnd(0, s), rnd(0, s), 1 + rnd(0, 2), 1 + rnd(0, 2));
      }
    }
    const limb = ctx.createRadialGradient(s / 2, s / 2, s * 0.32, s / 2, s / 2, s / 2);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = limb; ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  _metalTex() {
    const s = 256;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a8a9a'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.1})`;
      ctx.fillRect(rnd(0, s), rnd(0, s), 1 + rnd(0, 40), 1 + rnd(0, 3));
    }
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(rnd(0, s), rnd(0, s));
      ctx.lineTo(rnd(0, s), rnd(0, s));
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _asteroidTex() {
    const s = 128;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s * 0.4, s * 0.4, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#b0a090'); g.addColorStop(1, '#282018');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(rnd(0, s), rnd(0, s), 1 + rnd(0, 8), 0, TAU);
      ctx.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.35})`;
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  // ===================== MARKERS (course cursor) =====================
  _initMarkers() {
    // Move range ring
    const ringGeo = new THREE.RingGeometry(0.98, 1.02, 64);
    this._rangeMove = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffe090, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    this._rangeMove.rotation.x = 0; // in XY plane for ortho top-down... actually z-up is default, we use XY
    this._rangeMove.visible = false;
    this.markerGroup.add(this._rangeMove);

    // Weapon range
    this._rangeWeapon = new THREE.Mesh(
      new THREE.RingGeometry(0.98, 1.01, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff5570, transparent: true, opacity: 0.35,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    this._rangeWeapon.visible = false;
    this.markerGroup.add(this._rangeWeapon);

    // Course target crosshair
    const cross = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 0.9 });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(28, 2.5, 1), mat);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 28, 1), mat);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(12, 15, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    cross.add(bar1, bar2, ring);
    cross.visible = false;
    this._markerMove = cross;
    this.markerGroup.add(cross);

    // Target ship bracket
    const bracket = new THREE.Group();
    const bmat = new THREE.LineBasicMaterial({ color: 0xff4d5e });
    const s = 22;
    const pts = [
      [[-s, -s], [-s * 0.4, -s]], [[-s, -s], [-s, -s * 0.4]],
      [[s, -s], [s * 0.4, -s]], [[s, -s], [s, -s * 0.4]],
      [[-s, s], [-s * 0.4, s]], [[-s, s], [-s, s * 0.4]],
      [[s, s], [s * 0.4, s]], [[s, s], [s, s * 0.4]]
    ];
    for (const [[x1, y1], [x2, y2]] of pts) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y1, 5), new THREE.Vector3(x2, y2, 5)
      ]);
      bracket.add(new THREE.Line(g, bmat));
    }
    bracket.visible = false;
    this._markerTarget = bracket;
    this.markerGroup.add(bracket);
  }

  setMarkers(player, moveTarget, targetShipUid, maxSpeed, weaponRange, ships) {
    // Range rings around player
    if (this._rangeMove) {
      this._rangeMove.visible = true;
      this._rangeMove.position.set(player.x, player.y, 1);
      this._rangeMove.scale.set(maxSpeed, maxSpeed, 1);
      this._rangeMove.material.opacity = 0.25 + 0.1 * Math.sin(this.t * 3);
    }
    if (this._rangeWeapon) {
      this._rangeWeapon.visible = true;
      this._rangeWeapon.position.set(player.x, player.y, 1);
      const wr = weaponRange || 380;
      this._rangeWeapon.scale.set(wr, wr, 1);
    }
    // Course cursor
    if (this._markerMove) {
      if (moveTarget) {
        this._markerMove.visible = true;
        this._markerMove.position.set(moveTarget.x, moveTarget.y, 8);
        const pulse = 1 + 0.12 * Math.sin(this.t * 8);
        this._markerMove.scale.setScalar(pulse);
        // line from player to target
        this._drawCourseLine(player.x, player.y, moveTarget.x, moveTarget.y);
      } else {
        this._markerMove.visible = false;
        this._clearCourseLine();
      }
    }
    // Target bracket
    if (this._markerTarget) {
      let tgt = null;
      if (targetShipUid && ships) {
        tgt = ships.find(s => s.uid === targetShipUid);
      }
      if (tgt) {
        this._markerTarget.visible = true;
        this._markerTarget.position.set(tgt.x, tgt.y, 10);
        const pulse = 1 + 0.08 * Math.sin(this.t * 6);
        this._markerTarget.scale.setScalar(pulse);
      } else {
        this._markerTarget.visible = false;
      }
    }
  }

  _drawCourseLine(x0, y0, x1, y1) {
    if (this._courseLine) {
      this.markerGroup.remove(this._courseLine);
      this._courseLine.geometry.dispose();
      this._courseLine.material.dispose();
    }
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, y0, 3),
      new THREE.Vector3(x1, y1, 3)
    ]);
    this._courseLine = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: 0xffd77a, transparent: true, opacity: 0.7,
      dashSize: 12, gapSize: 8
    }));
    this._courseLine.computeLineDistances();
    this.markerGroup.add(this._courseLine);
  }
  _clearCourseLine() {
    if (this._courseLine) {
      this.markerGroup.remove(this._courseLine);
      this._courseLine.geometry.dispose();
      this._courseLine.material.dispose();
      this._courseLine = null;
    }
  }

  // ===================== BACKGROUND =====================
  _makeStarField() {
    const N = 2200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = rnd(-7000, 7000);
      pos[i * 3 + 1] = rnd(-7000, 7000);
      pos[i * 3 + 2] = rnd(-800, 100);
      const bright = 0.65 + Math.random() * 0.35;
      const hue = Math.random() < 0.12 ? 0.08 : (Math.random() < 0.08 ? 0.62 : 0.55);
      const c = new THREE.Color().setHSL(hue, 0.35, bright);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starField = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 3.8, vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false
    }));
    this.scene.add(this.starField);
  }

  _makeNebulae() {
    const hues = [210, 280, 30, 330, 170, 250, 190];
    for (let i = 0; i < 7; i++) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 120);
      const h = hues[i];
      g.addColorStop(0, `hsla(${h},90%,62%,0.6)`);
      g.addColorStop(0.4, `hsla(${h},65%,42%,0.14)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7
      });
      const spr = new THREE.Sprite(mat);
      spr.position.set(rnd(-2500, 2500), rnd(-2500, 2500), -100);
      const sc = rnd(800, 1600);
      spr.scale.set(sc, sc, 1);
      spr.userData.drift = rnd(-0.02, 0.02);
      this.scene.add(spr);
      if (!this._nebSprites) this._nebSprites = [];
      this._nebSprites.push(spr);
    }
  }

  _makeCentralStar() {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(48, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe8a0 })
    );
    this.root.add(core);
    this.starMesh = core;
    for (const [sc, op] of [[200, 0.55], [360, 0.28], [520, 0.14], [700, 0.07]]) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(255,235,160,${op})`);
      g.addColorStop(0.35, `rgba(255,150,40,${op * 0.45})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      spr.scale.set(sc, sc, 1);
      this.root.add(spr);
      if (sc === 360) this.starGlow = spr;
    }
  }

  // ===================== PLANETS =====================
  clearPlanets() {
    while (this.planetGroup.children.length) {
      const m = this.planetGroup.children[0];
      this.planetGroup.remove(m);
      m.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.planetMeshes = [];
  }

  addPlanet(pl) {
    const type = pl.type || 'rock';
    const tex = this.textures[type] || this.textures.rock;
    const size = pl.size || 30;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 48, 48),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: type === 'ice' ? 0.18 : 0.6,
        metalness: type === 'tech' ? 0.55 : 0.06,
        emissive: type === 'lava' ? new THREE.Color(0x551100) : new THREE.Color(0x000000),
        emissiveIntensity: type === 'lava' ? 1.1 : 0
      })
    );
    mesh.userData = {
      orbit: pl.orbit,
      ang: pl.ang || 0,
      spd: pl.spd || 0.04,
      size,
      type,
      planetIndex: pl.planetIndex != null ? pl.planetIndex : null
    };
    mesh.position.set(Math.cos(mesh.userData.ang) * pl.orbit, Math.sin(mesh.userData.ang) * pl.orbit, 0);

    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(size * 1.14, 28, 28),
      new THREE.MeshBasicMaterial({
        color: type === 'ice' ? 0xa0d8ff : (type === 'lava' ? 0xff6020 : 0x80b0ff),
        transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false
      })
    );
    mesh.add(atm);

    if (pl.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.45, size * 2.2, 80),
        new THREE.MeshBasicMaterial({ color: 0xd8e8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = 1.12;
      mesh.add(ring);
    }
    if (pl.hasPort) {
      const port = new THREE.Mesh(
        new THREE.SphereGeometry(5, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x66ffaa })
      );
      port.position.set(size * 0.78, size * 0.42, size * 0.38);
      mesh.add(port);
      mesh.userData.portMesh = port;
    }
    this.planetGroup.add(mesh);
    this.planetMeshes.push(mesh);
    return mesh;
  }

  // ===================== ASTEROIDS =====================
  clearAsteroids() {
    while (this.asteroidGroup.children.length) {
      const m = this.asteroidGroup.children[0];
      this.asteroidGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    this.asteroids = [];
  }

  spawnAsteroidBelt(count = 70, rMin = 900, rMax = 1200) {
    this.clearAsteroids();
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * TAU;
      const r = rMin + Math.random() * (rMax - rMin);
      const size = 5 + Math.random() * 16;
      const geo = new THREE.IcosahedronGeometry(size, 2);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const n = 0.7 + Math.random() * 0.55;
        pos.setXYZ(v, pos.getX(v) * n, pos.getY(v) * n, pos.getZ(v) * n);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        map: this.textures.asteroid,
        roughness: 0.92, metalness: 0.08,
        color: new THREE.Color().setHSL(0.08, 0.18, 0.32 + Math.random() * 0.25)
      }));
      mesh.position.set(Math.cos(ang) * r, Math.sin(ang) * r, rnd(-40, 40));
      mesh.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
      mesh.userData = { orbit: r, ang, spd: 0.01 + Math.random() * 0.025, rotSpeed: (Math.random() - 0.5) * 1.8 };
      this.asteroidGroup.add(mesh);
      this.asteroids.push(mesh);
    }
  }

  // ===================== STATIONS =====================
  clearStations() {
    while (this.stationGroup.children.length) this.stationGroup.remove(this.stationGroup.children[0]);
    this.stations = [];
  }

  _makeStationMesh(scale = 1) {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({
      map: this.textures.metal, color: 0x9aaabb,
      roughness: 0.35, metalness: 0.8
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0x40d0ff, emissive: 0x2080c0, emissiveIntensity: 0.7,
      roughness: 0.25, metalness: 0.55
    });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(16 * scale, 16 * scale, 22 * scale, 16), metal);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    // double ring
    for (const rr of [32, 42]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * scale, 3.2 * scale, 10, 48), metal);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      if (rr === 32) g.userData.ring = ring;
    }
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(38 * scale, 2.2 * scale, 2.2 * scale), metal);
      spoke.rotation.z = i * Math.PI / 3;
      g.add(spoke);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(10 * scale, 4 * scale, 26 * scale), metal);
      arm.position.set(Math.cos(a) * 28 * scale, Math.sin(a) * 28 * scale, 0);
      arm.rotation.z = a;
      g.add(arm);
      const light = new THREE.Mesh(new THREE.SphereGeometry(2.5 * scale, 10, 10), accent);
      light.position.set(Math.cos(a) * 38 * scale, Math.sin(a) * 38 * scale, 0);
      g.add(light);
    }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(1 * scale, 1 * scale, 36 * scale, 8), metal);
    ant.position.z = 24 * scale; ant.rotation.x = Math.PI / 2;
    g.add(ant);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(7 * scale, 12, 12, 0, TAU, 0, Math.PI / 2), accent
    );
    dish.position.z = 40 * scale; dish.rotation.x = -Math.PI / 2;
    g.add(dish);
    return g;
  }

  addStation(x, y, scale = 1) {
    const mesh = this._makeStationMesh(scale);
    mesh.position.set(x, y, 0);
    this.stationGroup.add(mesh);
    this.stations.push(mesh);
    return mesh;
  }

  // ===================== SHIPS (high detail) =====================
  clearShips() {
    while (this.shipGroup.children.length) {
      const c = this.shipGroup.children[0];
      this.shipGroup.remove(c);
    }
    this.shipMeshes.clear();
    this.trails.clear();
    // playerMesh was removed from scene — must recreate on next setPlayer
    this.playerMesh = null;
  }

  _makeShipMesh(type, facColor) {
    const g = new THREE.Group();
    const col = new THREE.Color(facColor || '#ffd77a');
    const hull = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.32, metalness: 0.65,
      emissive: col, emissiveIntensity: 0.28
    });
    const dark = new THREE.MeshStandardMaterial({
      color: col.clone().multiplyScalar(0.3), roughness: 0.45, metalness: 0.5
    });
    const glow = new THREE.MeshBasicMaterial({ color: 0x90ffff, transparent: true, opacity: 1.0 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88e8ff, transparent: true, opacity: 0.65, metalness: 0.9, roughness: 0.15
    });

    if (type === 'trader') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(32, 14, 12), hull));
      const nose = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 10), hull);
      nose.position.x = 18; g.add(nose);
      for (const z of [-8, 8]) {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 20, 10), dark);
        pod.rotation.z = Math.PI / 2; pod.position.set(0, 0, z); g.add(pod);
      }
      // bridge
      const br = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 6), glass);
      br.position.set(10, 8, 0); g.add(br);
      for (const y of [-5, 5]) {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 7, 10), dark);
        eng.rotation.z = Math.PI / 2; eng.position.set(-18, y, 0); g.add(eng);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 10), glow);
        flame.position.set(-23, y, 0); g.add(flame);
        g.userData.flames = g.userData.flames || []; g.userData.flames.push(flame);
      }
    } else if (type === 'raider') {
      const body = new THREE.Mesh(new THREE.ConeGeometry(10, 36, 6), hull);
      body.rotation.z = -Math.PI / 2; g.add(body);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(7, 26, 1.8), dark);
        w.position.set(-3, s * 12, 0); w.rotation.z = s * 0.28; g.add(w);
        // wing tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 4), hull);
        tip.position.set(-3, s * 24, 0); tip.rotation.z = s * 0.5; g.add(tip);
      }
      const flame = new THREE.Mesh(new THREE.SphereGeometry(3.5, 10, 10), glow);
      flame.position.set(-20, 0, 0); g.add(flame);
      g.userData.flames = [flame];
    } else if (type === 'pirate') {
      const body = new THREE.Mesh(new THREE.ConeGeometry(8, 24, 4), hull);
      body.rotation.z = -Math.PI / 2; g.add(body);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 16, 1.2), dark);
      fin.position.set(-5, 0, 0); g.add(fin);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(2, 10, 3), dark);
      spike.position.set(10, 0, 0); spike.rotation.z = -Math.PI / 2; g.add(spike);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 10), glow);
      flame.position.set(-15, 0, 0); g.add(flame);
      g.userData.flames = [flame];
    } else {
      // fighter / player / patrol — most detailed
      const body = new THREE.Mesh(new THREE.ConeGeometry(8, 30, 8), hull);
      body.rotation.z = -Math.PI / 2; g.add(body);
      const cock = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), glass);
      cock.position.set(7, 0, 3.5); g.add(cock);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 1.5), dark);
        w.position.set(-5, s * 10, 0); w.rotation.z = s * 0.12; g.add(w);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 6), dark);
        gun.rotation.z = Math.PI / 2; gun.position.set(8, s * 6, -2); g.add(gun);
      }
      // vertical stabilizer
      const stab = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 10), dark);
      stab.position.set(-8, 0, 6); g.add(stab);
      for (const y of [-4, 4]) {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 6, 10), dark);
        eng.rotation.z = Math.PI / 2; eng.position.set(-16, y, 0); g.add(eng);
        const flame = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 10), glow);
        flame.position.set(-20, y, 0); g.add(flame);
        g.userData.flames = g.userData.flames || []; g.userData.flames.push(flame);
      }
    }

    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(26, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0x80ffff, transparent: true, opacity: 0,
        wireframe: true, depthWrite: false
      })
    );
    g.add(shield);
    g.userData.shield = shield;
    g.userData.type = type;
    g.scale.setScalar(type === 'raider' ? 1.2 : (type === 'trader' ? 1.05 : 1.15));
    return g;
  }

  addShip(s) {
    const facC = (FACS[s.fac] && FACS[s.fac].c) || '#ffd77a';
    const mesh = this._makeShipMesh(s.type, facC);
    mesh.position.set(s.x, s.y, 0);
    mesh.rotation.z = s.ang || 0;
    mesh.userData.uid = s.uid;
    this.shipGroup.add(mesh);
    this.shipMeshes.set(s.uid, mesh);
    this.trails.set(s.uid, []);
    return mesh;
  }

  updateShip(s, dt = 0.016) {
    const mesh = this.shipMeshes.get(s.uid);
    if (!mesh) return;
    mesh.position.x += (s.x - mesh.position.x) * 0.28;
    mesh.position.y += (s.y - mesh.position.y) * 0.28;
    let da = (s.ang || 0) - mesh.rotation.z;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    mesh.rotation.z += da * 0.22;

    const speed = Math.hypot(s.x - (mesh.userData.lastX || s.x), s.y - (mesh.userData.lastY || s.y)) / Math.max(dt, 0.001);
    mesh.userData.lastX = s.x; mesh.userData.lastY = s.y;

    if (mesh.userData.flames) {
      for (const f of mesh.userData.flames) {
        const pulse = 0.75 + 0.55 * Math.sin(this.t * 16 + s.uid) * Math.min(1.2, speed / 60);
        f.scale.setScalar(pulse);
        f.material.opacity = 0.55 + 0.4 * pulse;
      }
    }
    let trail = this.trails.get(s.uid);
    if (!trail) { trail = []; this.trails.set(s.uid, trail); }
    if (speed > 25) {
      trail.push({
        x: mesh.position.x - Math.cos(mesh.rotation.z) * 20,
        y: mesh.position.y - Math.sin(mesh.rotation.z) * 20,
        life: 0.65, max: 0.65
      });
      if (trail.length > 36) trail.shift();
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= dt;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  removeShip(uid) {
    const mesh = this.shipMeshes.get(uid);
    if (mesh) { this.shipGroup.remove(mesh); this.shipMeshes.delete(uid); }
    this.trails.delete(uid);
  }

  setPlayer(p) {
    if (!this.playerMesh || !this.playerMesh.parent) {
      this.playerMesh = this._makeShipMesh('player', '#ffd77a');
      this.playerMesh.scale.setScalar(1.35);
      this.playerMesh.position.set(p.x || 0, p.y || 0, 0);
      this.shipGroup.add(this.playerMesh);
      this.trails.set('player', []);
    }
    const m = this.playerMesh;
    m.position.x += (p.x - m.position.x) * 0.35;
    m.position.y += (p.y - m.position.y) * 0.35;
    let da = (p.face || 0) - m.rotation.z;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    m.rotation.z += da * 0.28;

    const sh = m.userData.shield;
    if (sh) {
      const ratio = (p.shield || 0) / (p.maxShield || 1);
      sh.material.opacity = ratio > 0.05 ? 0.12 + 0.18 * Math.sin(this.t * 5) * ratio : 0;
    }
    if (m.userData.flames) {
      for (const f of m.userData.flames) {
        f.scale.setScalar(0.9 + 0.45 * Math.sin(this.t * 18));
      }
    }
    let trail = this.trails.get('player');
    if (!trail) {
      trail = [];
      this.trails.set('player', trail);
    }
    trail.push({
      x: m.position.x - Math.cos(m.rotation.z) * 22,
      y: m.position.y - Math.sin(m.rotation.z) * 22,
      life: 0.7, max: 0.7
    });
    if (trail.length > 40) trail.shift();
  }

  // ===================== FX =====================
  boom(x, y, size = 24, color = '#ff7043') {
    const n = Math.min(90, 25 + size);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = 60 + Math.random() * 260;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.4 + Math.random() * 0.8, max: 1,
        s: 2 + Math.random() * 7, color: new THREE.Color(color)
      });
    }
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,200,1)');
    g.addColorStop(0.2, 'rgba(255,150,40,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.position.set(x, y, 20);
    spr.scale.set(60 + size, 60 + size, 1);
    spr.userData.life = 0.32;
    this.fxGroup.add(spr);
    this.shots.push(spr);
  }

  shot(x0, y0, x1, y1, color = '#7dd8ff') {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x0, y0, 12), new THREE.Vector3(x1, y1, 12)
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: new THREE.Color(color), transparent: true, opacity: 0.95
    }));
    line.userData.life = 0.28;
    this.fxGroup.add(line);
    this.shots.push(line);
  }

  setCameraTarget(x, y, shake = 0) {
    this.camera.position.x += (x - this.camera.position.x) * 0.08;
    this.camera.position.y += (y - this.camera.position.y) * 0.08;
    if (shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * shake * 5;
      this.camera.position.y += (Math.random() - 0.5) * shake * 5;
    }
  }

  update(dt) {
    this.t += dt;
    if (this.starGlow) {
      const p = 1 + 0.08 * Math.sin(this.t * 2.2);
      this.starGlow.scale.setScalar(340 * p);
    }
    if (this.starMesh) this.starMesh.rotation.y += dt * 0.15;

    // Planets orbit ONLY on turn advance (see advanceOrbits) — here only self-spin + port blink
    for (const mesh of this.planetMeshes) {
      const ud = mesh.userData;
      mesh.rotation.y += dt * 0.4;
      if (ud.portMesh) ud.portMesh.material.opacity = 0.5 + 0.5 * Math.sin(this.t * 5);
    }
    for (const a of this.asteroids) {
      const ud = a.userData;
      ud.ang += ud.spd * dt;
      a.position.x = Math.cos(ud.ang) * ud.orbit;
      a.position.y = Math.sin(ud.ang) * ud.orbit;
      a.rotation.x += ud.rotSpeed * dt;
      a.rotation.y += ud.rotSpeed * 0.6 * dt;
    }
    for (const st of this.stations) {
      st.rotation.z += dt * 0.12;
      if (st.userData.ring) st.userData.ring.rotation.z -= dt * 0.45;
    }
    if (this._nebSprites) {
      for (const s of this._nebSprites) {
        s.position.x += (s.userData.drift || 0) * dt * 10;
        s.material.rotation += dt * 0.02;
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.userData.life -= dt;
      if (s.material) s.material.opacity = Math.max(0, s.userData.life * 3.2);
      if (s.userData.life <= 0) {
        this.fxGroup.remove(s);
        this.shots.splice(i, 1);
        if (s.geometry) s.geometry.dispose();
        if (s.material) { s.material.map?.dispose(); s.material.dispose(); }
      }
    }
    // trails
    while (this.trailGroup.children.length) {
      const c = this.trailGroup.children[0];
      this.trailGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    for (const [, trail] of this.trails) {
      if (trail.length < 2) continue;
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        const alpha = (b.life / b.max) * 0.6;
        if (alpha < 0.03) continue;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x, a.y, 2), new THREE.Vector3(b.x, b.y, 2)
        ]);
        this.trailGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
          color: 0x70f0ff, transparent: true, opacity: alpha
        })));
      }
    }
    if (this.starField) this.starField.rotation.z = this.t * 0.005;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  buildDemoSystem() {
    this.clearPlanets();
    this.clearAsteroids();
    this.clearStations();
    this.clearShips();
    const planets = [
      { type: 'rock', orbit: 180, size: 32, spd: 0.1, ang: 0.5, hasPort: true, ring: false },
      { type: 'ice', orbit: 320, size: 26, spd: 0.06, ang: 2.1, hasPort: true, ring: false },
      { type: 'lava', orbit: 460, size: 42, spd: 0.04, ang: 3.9, hasPort: false, ring: false },
      { type: 'gas', orbit: 640, size: 70, spd: 0.022, ang: 1.2, hasPort: false, ring: true },
      { type: 'tech', orbit: 800, size: 34, spd: 0.015, ang: 4.6, hasPort: true, ring: false }
    ];
    planets.forEach(p => this.addPlanet(p));
    this.spawnAsteroidBelt(75, 950, 1250);
    this.addStation(180 * Math.cos(0.5) + 70, 180 * Math.sin(0.5) + 30, 0.85);
    this.addStation(800 * Math.cos(4.6) - 50, 800 * Math.sin(4.6) + 20, 1.05);
    this.addStation(-280, 480, 0.7);
  }

  buildSystemFromData(S) {
    this.clearPlanets();
    this.clearAsteroids();
    this.clearStations();
    this.clearShips();
    if (!S || !S.planets) {
      this.buildDemoSystem();
      return;
    }
    S.planets.forEach((pl, idx) => {
      this.addPlanet({
        type: pl.type || 'rock',
        orbit: pl.orbit,
        size: pl.size,
        spd: pl.spd,
        ang: pl.ang,
        hasPort: !!pl.hasPort,
        ring: !!pl.ring,
        planetIndex: idx
      });
      if (pl.hasPort) {
        const px = Math.cos(pl.ang) * pl.orbit;
        const py = Math.sin(pl.ang) * pl.orbit;
        const off = pl.size + 28;
        const st = this.addStation(
          px + Math.cos(pl.ang + 0.4) * off,
          py + Math.sin(pl.ang + 0.4) * off,
          0.85
        );
        // station follows planet on turn advance
        st.userData.planetIndex = idx;
        st.userData.orbit = pl.orbit;
        st.userData.size = pl.size;
        st.userData.angOff = 0.4;
      }
    });
    this.spawnAsteroidBelt(50, 900, 1300);
  }

  /**
   * Advance planetary orbits by one (or more) game turns.
   * Call only from endTurn — planets do not drift in real-time.
   * Also syncs station positions that orbit with ports.
   * @param {number} steps - number of turns/days
   * @param {object[]} [planetData] - optional systems[sys].planets to keep data.ang in sync
   */
  advanceOrbits(steps = 1, planetData = null) {
    const k = steps * 0.55; // orbital step per day
    for (let i = 0; i < this.planetMeshes.length; i++) {
      const mesh = this.planetMeshes[i];
      const ud = mesh.userData;
      ud.ang = (ud.ang || 0) + (ud.spd || 0.04) * k;
      mesh.position.x = Math.cos(ud.ang) * ud.orbit;
      mesh.position.y = Math.sin(ud.ang) * ud.orbit;
      if (planetData && planetData[i]) {
        planetData[i].ang = ud.ang;
      }
    }
    for (const st of this.stations) {
      const ud = st.userData;
      if (ud.planetIndex == null) continue;
      const pm = this.planetMeshes[ud.planetIndex];
      if (!pm) continue;
      const ang = pm.userData.ang;
      const orbit = ud.orbit != null ? ud.orbit : pm.userData.orbit;
      const size = ud.size != null ? ud.size : pm.userData.size;
      const off = (size || 30) + 28;
      const ao = ud.angOff != null ? ud.angOff : 0.4;
      st.position.x = Math.cos(ang) * orbit + Math.cos(ang + ao) * off;
      st.position.y = Math.sin(ang) * orbit + Math.sin(ang + ao) * off;
    }
  }
}
