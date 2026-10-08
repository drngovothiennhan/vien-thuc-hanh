// Nghe tim phổi trên mô hình 3D.
// Vị trí điểm nghe: tọa độ (x, y) trên mặt trước ngực, x dương là bên trái bệnh nhân.
// Theo quy ước: bên phải bệnh nhân hiển thị ở bên trái màn hình.
(function () {
  var SEL_COLOR = 0xf59e0b;
  var IDLE_COLOR = 0x1d4ed8;

  var POINTS = [
    { id: "aortic", label: "Van động mạch chủ", kind: "heart", bpm: 72, s1: 0.6, s2: 1.0,
      pos: [-0.2, 0.9], where: "Khoang liên sườn 2, bên phải xương ức" },
    { id: "pulmonic", label: "Van động mạch phổi", kind: "heart", bpm: 72, s1: 0.6, s2: 1.0,
      pos: [0.2, 0.9], where: "Khoang liên sườn 2, bên trái xương ức" },
    { id: "erb", label: "Điểm Erb", kind: "heart", bpm: 72, s1: 0.8, s2: 0.8,
      pos: [0.3, 0.6], where: "Khoang liên sườn 3, bên trái xương ức" },
    { id: "tricuspid", label: "Van ba lá", kind: "heart", bpm: 72, s1: 1.0, s2: 0.6,
      pos: [0.15, 0.2], where: "Khoang liên sườn 4–5, sát bờ trái xương ức" },
    { id: "mitral", label: "Van hai lá (mỏm tim)", kind: "heart", bpm: 72, s1: 1.0, s2: 0.5,
      pos: [0.6, 0.1], where: "Khoang liên sườn 5, đường giữa đòn trái" },
    { id: "lung-r-up", label: "Phổi phải — phía trên", kind: "lung", breathPeriod: 4,
      pos: [-0.8, 0.7], where: "Thùy trên phổi phải, mặt trước" },
    { id: "lung-r-low", label: "Phổi phải — phía dưới", kind: "lung", breathPeriod: 4,
      pos: [-0.9, -0.2], where: "Thùy dưới phổi phải, mặt trước" },
    { id: "lung-l-up", label: "Phổi trái — phía trên", kind: "lung", breathPeriod: 4,
      pos: [0.8, 0.7], where: "Thùy trên phổi trái, mặt trước" },
    { id: "lung-l-low", label: "Phổi trái — phía dưới", kind: "lung", breathPeriod: 4,
      pos: [0.9, -0.2], where: "Thùy dưới phổi trái, mặt trước" }
  ];

  var wrap = document.getElementById("scene-wrap");
  var list = document.getElementById("point-list");
  var statusEl = document.getElementById("status");
  var stopBtn = document.getElementById("stop-btn");
  var volEl = document.getElementById("volume");

  // Ngực là ellipsoid (1.6, 2.0, 1.1). Tính z trên mặt trước tại (x, y).
  function frontZ(x, y) {
    var k = 1 - (x / 1.6) * (x / 1.6) - (y / 2) * (y / 2);
    return 1.1 * Math.sqrt(Math.max(k, 0));
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7.5);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  wrap.appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.minDistance = 4;
  controls.maxDistance = 12;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  var sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(2, 3, 5);
  scene.add(sun);

  function mesh(geo, color, opacity, scale, pos, rotZ) {
    var mat = new THREE.MeshStandardMaterial({
      color: color, transparent: opacity < 1, opacity: opacity, roughness: 0.7
    });
    var m = new THREE.Mesh(geo, mat);
    m.scale.set(scale[0], scale[1], scale[2]);
    m.position.set(pos[0], pos[1], pos[2]);
    if (rotZ) m.rotation.z = rotZ;
    scene.add(m);
    return m;
  }

  // Thân ngực, phổi, tim, xương ức (đơn giản hóa, không phải giải phẫu chi tiết).
  mesh(new THREE.SphereGeometry(1, 48, 32), 0xe9c9b0, 0.25, [1.6, 2.0, 1.1], [0, 0, 0]);
  mesh(new THREE.SphereGeometry(1, 40, 28), 0x9ec9e8, 0.45, [0.6, 1.25, 0.7], [-0.75, 0.2, 0]);
  mesh(new THREE.SphereGeometry(1, 40, 28), 0x9ec9e8, 0.45, [0.6, 1.25, 0.7], [0.75, 0.2, 0]);
  mesh(new THREE.SphereGeometry(1, 36, 24), 0xb3261e, 0.9, [0.45, 0.55, 0.4], [0.25, -0.25, 0.35], -0.5);
  mesh(new THREE.BoxGeometry(1, 1, 1), 0xf5efe6, 1, [0.22, 1.9, 0.12], [0, 0.45, 1.12]);

  // Các điểm nghe (đánh dấu có thể bấm)
  var markers = [];
  var markerGeo = new THREE.SphereGeometry(0.09, 20, 14);
  POINTS.forEach(function (p) {
    var z = frontZ(p.pos[0], p.pos[1]) + 0.06;
    var m = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({ color: IDLE_COLOR, emissive: 0x111111 }));
    m.position.set(p.pos[0], p.pos[1], z);
    m.userData.id = p.id;
    scene.add(m);
    markers.push(m);
  });

  // Đầu ống nghe hiển thị tại điểm đang nghe
  var head = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.025, 10, 28),
    new THREE.MeshStandardMaterial({ color: SEL_COLOR, emissive: 0x332200 })
  );
  head.visible = false;
  scene.add(head);

  var current = null;

  function paintMarkers() {
    markers.forEach(function (m) {
      var isSel = current && m.userData.id === current.id;
      m.material.color.setHex(isSel ? SEL_COLOR : IDLE_COLOR);
    });
    Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", current && b.dataset.id === current.id ? "true" : "false");
    });
  }

  function select(id) {
    var p = POINTS.find(function (x) { return x.id === id; });
    if (!p) return;
    current = p;
    var m = markers.find(function (x) { return x.userData.id === id; });
    head.visible = true;
    head.position.copy(m.position);
    head.lookAt(m.position.x, m.position.y, m.position.z + 1);
    window.VTHSound.start(p);
    statusEl.textContent = "Đang nghe: " + p.label + " — " + p.where;
    stopBtn.disabled = false;
    paintMarkers();
  }

  function stopListening() {
    window.VTHSound.stop();
    current = null;
    head.visible = false;
    statusEl.textContent = "Chọn một điểm trên ngực để nghe.";
    stopBtn.disabled = true;
    paintMarkers();
  }

  // Danh sách nút: dùng được cả khi không bấm trực tiếp lên 3D
  POINTS.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.id = p.id;
    b.textContent = p.label;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () { select(p.id); });
    list.appendChild(b);
  });

  // Phân biệt bấm và kéo xoay
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var downX = 0, downY = 0;
  renderer.domElement.addEventListener("pointerdown", function (e) {
    downX = e.clientX; downY = e.clientY;
  });
  renderer.domElement.addEventListener("pointerup", function (e) {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    var r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var hit = raycaster.intersectObjects(markers, false)[0];
    if (hit) select(hit.object.userData.id);
  });

  stopBtn.addEventListener("click", stopListening);
  volEl.addEventListener("input", function () {
    window.VTHSound.setVolume(Number(volEl.value));
  });

  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + "px";
    renderer.domElement.style.height = h + "px";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  (function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();

  stopBtn.disabled = true;
})();
