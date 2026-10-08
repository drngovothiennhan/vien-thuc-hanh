// Dependency-free WebGL chest viewer for the auscultation room.
// Model: BodyParts3D 4.0 (CC BY 4.0), cut by scripts/can-lam-sang/build-chest-model.py.
// Axes: +y up, +z anterior, +x patient's left.

export const HEART_SITES = [
  { id: 'rusb', label: 'Ổ van ĐMC (KGS 2 phải)', x: -0.03, y: 1.335 },
  { id: 'lusb', label: 'Ổ van ĐM phổi (KGS 2 trái)', x: 0.04, y: 1.335 },
  { id: 'llsb', label: 'Ổ van 3 lá (KGS 4 trái, cạnh ức)', x: 0.035, y: 1.28 },
  { id: 'apex', label: 'Mỏm tim (KGS 5 trái, đường giữa đòn)', x: 0.085, y: 1.225 }
];
export const LUNG_SITES = [
  { id: 'rua', label: 'Phổi phải — trên', x: -0.09, y: 1.35 },
  { id: 'rma', label: 'Phổi phải — giữa', x: -0.09, y: 1.265 },
  { id: 'rla', label: 'Phổi phải — dưới', x: -0.09, y: 1.18 },
  { id: 'lua', label: 'Phổi trái — trên', x: 0.09, y: 1.35 },
  { id: 'lma', label: 'Phổi trái — giữa', x: 0.09, y: 1.265 },
  { id: 'lla', label: 'Phổi trái — dưới', x: 0.09, y: 1.18 }
];

const COLORS = {
  bone: [0.91, 0.87, 0.75, 1],
  heart: [0.78, 0.22, 0.2, 1],
  airway: [0.42, 0.7, 0.85, 1],
  skin: [0.86, 0.62, 0.48, 0.42]
};

const VS = `attribute vec3 p;attribute vec3 n;uniform mat4 m;uniform mat3 nm;varying vec3 vn;
void main(){vn=nm*n;gl_Position=m*vec4(p,1.0);}`;
const FS = `precision mediump float;varying vec3 vn;uniform vec4 c;
void main(){vec3 n=normalize(vn);if(!gl_FrontFacing)n=-n;float d=max(dot(n,normalize(vec3(0.3,0.5,0.8))),0.0);
float l=0.35+0.65*d;gl_FragColor=vec4(c.rgb*l,c.a);}`;

function mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
    o[i * 4 + j] = s;
  }
  return o;
}
function perspective(fov, asp, near, far) {
  const f = 1 / Math.tan(fov / 2), o = new Float32Array(16);
  o[0] = f / asp; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1; o[14] = 2 * far * near / (near - far);
  return o;
}
function viewMatrix(yaw, pitch, dist, target) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // rotate world around target (yaw about Y, then pitch about X), then translate back by dist.
  const r = new Float32Array([
    cy, sy * sp, -sy * cp, 0,
    0, cp, sp, 0,
    sy, -cy * sp, cy * cp, 0,
    0, 0, 0, 1
  ]);
  const t0 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -target[0], -target[1], -target[2], 1]);
  const t1 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -dist, 1]);
  return mul(t1, mul(r, t0));
}
function applyPoint(m, v) {
  const x = v[0], y = v[1], z = v[2];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15]
  ];
}

function skinZ(model, buf, x, y) {
  const skin = model.parts.find((p) => p.group === 'skin');
  const pos = new Float32Array(buf, skin.positions, skin.vertexCount * 3);
  const idx = new Uint16Array(buf, skin.indices, skin.indexCount);
  let best = null;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    // 2D barycentric test in the xy plane, then interpolate z.
    const ax = pos[a], ay = pos[a + 1], bx = pos[b], by = pos[b + 1], cx = pos[c], cy = pos[c + 1];
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-12) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
    const w = 1 - u - v;
    if (u < 0 || v < 0 || w < 0) continue;
    const z = u * pos[a + 2] + v * pos[b + 2] + w * pos[c + 2];
    if (best === null || z > best) best = z;
  }
  return best;
}

export async function mountChest(container, { baseUrl = '/can-lam-sang/models/', sites = [], onSite } = {}) {
  container.classList.add('chest-viewer');
  const canvas = document.createElement('canvas');
  canvas.className = 'chest-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mô hình 3D lồng ngực. Kéo để xoay, cuộn hoặc chụm hai ngón để phóng to.');
  const overlay = document.createElement('div');
  overlay.className = 'chest-overlay';
  container.append(canvas, overlay);
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
  if (!gl) throw new Error('webgl_khong_ho_tro');

  const [model, buf] = await Promise.all([
    fetch(baseUrl + 'chest.json').then((r) => r.json()),
    fetch(baseUrl + 'chest.bin').then((r) => r.arrayBuffer())
  ]);

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const loc = { p: gl.getAttribLocation(prog, 'p'), n: gl.getAttribLocation(prog, 'n'), m: gl.getUniformLocation(prog, 'm'), nm: gl.getUniformLocation(prog, 'nm'), c: gl.getUniformLocation(prog, 'c') };

  const meshes = model.parts.map((p) => {
    const mk = (target, data) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    const pos = new Float32Array(buf, p.positions, p.vertexCount * 3);
    const nrm = new Int16Array(buf, p.normals, p.vertexCount * 3);
    const nf = new Float32Array(nrm.length);
    for (let i = 0; i < nrm.length; i++) nf[i] = nrm[i] / 32767;
    return {
      group: p.group, count: p.indexCount,
      pb: mk(gl.ARRAY_BUFFER, pos), nb: mk(gl.ARRAY_BUFFER, nf),
      ib: mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(buf, p.indices, p.indexCount))
    };
  });

  const state = { yaw: 0, pitch: 0.05, dist: 0.9, showSkin: true, selected: null, visited: new Set() };
  const target = [0, 1.28, 0.03];

  const markers = sites.map((s) => {
    const z = skinZ(model, buf, s.x, s.y);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'chest-site';
    el.dataset.site = s.id;
    el.setAttribute('aria-label', s.label);
    el.title = s.label;
    el.textContent = s.short || '';
    el.addEventListener('click', (e) => { e.stopPropagation(); onSite && onSite(s); });
    overlay.append(el);
    return { s, el, pos: [s.x, s.y, (z === null ? 0.1 : z) + 0.004] };
  });

  function resize() {
    const r = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const asp = canvas.width / canvas.height;
    const view = viewMatrix(state.yaw, state.pitch, state.dist, target);
    const mvp = mul(perspective(0.6, asp, 0.05, 5), view);
    const nm = new Float32Array([view[0], view[1], view[2], view[4], view[5], view[6], view[8], view[9], view[10]]);
    gl.uniformMatrix4fv(loc.m, false, mvp);
    gl.uniformMatrix3fv(loc.nm, false, nm);
    const pass = (filter, blend) => {
      if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      else { gl.disable(gl.BLEND); gl.depthMask(true); }
      for (const m of meshes) {
        if (!filter(m)) continue;
        gl.uniform4fv(loc.c, COLORS[m.group]);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.nb); gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
        gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
      }
      gl.depthMask(true);
    };
    pass((m) => m.group !== 'skin', false);
    if (state.showSkin) pass((m) => m.group === 'skin', true);
    // overlay buttons
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const camZ = Math.cos(state.yaw) * Math.cos(state.pitch);
    for (const mk of markers) {
      const q = applyPoint(mvp, mk.pos);
      const facing = mk.pos[2] > 0 ? camZ > 0.05 : true;
      const visible = q[3] > 0 && facing && state.showSkin;
      mk.el.hidden = !visible;
      if (!visible) continue;
      mk.el.style.left = ((q[0] / q[3]) * 0.5 + 0.5) * w + 'px';
      mk.el.style.top = (1 - ((q[1] / q[3]) * 0.5 + 0.5)) * h + 'px';
      mk.el.classList.toggle('is-selected', state.selected === mk.s.id);
      mk.el.classList.toggle('is-visited', state.visited.has(mk.s.id));
    }
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  // drag to rotate, wheel / pinch to zoom
  const pointers = new Map();
  let pinch = 0;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); });
  canvas.addEventListener('pointerup', (e) => { pointers.delete(e.pointerId); pinch = 0; });
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch = 0; });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    if (pointers.size === 1) {
      state.yaw += (e.clientX - prev[0]) * 0.008;
      state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch + (e.clientY - prev[1]) * 0.008));
    }
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) state.dist = Math.max(0.35, Math.min(1.8, state.dist * (pinch / d)));
      pinch = d;
    }
    schedule();
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); state.dist = Math.max(0.35, Math.min(1.8, state.dist * (1 + Math.sign(e.deltaY) * 0.08))); schedule(); }, { passive: false });
  window.addEventListener('resize', schedule);

  schedule();
  return {
    model,
    setSkin(v) { state.showSkin = v; schedule(); },
    select(id) { state.selected = id; schedule(); },
    markVisited(id) { state.visited.add(id); schedule(); },
    setView(yaw, pitch) { state.yaw = yaw; state.pitch = pitch; schedule(); },
    redraw: schedule,
    destroy() { window.removeEventListener('resize', schedule); container.replaceChildren(); }
  };
}
