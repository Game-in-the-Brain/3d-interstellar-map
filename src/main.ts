import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function init() {
  const canvas = document.getElementById('glcanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas #glcanvas not found');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Sol marker
  const solGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const solMat = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
  const sol = new THREE.Mesh(solGeo, solMat);
  scene.add(sol);

  // Grid helper for spatial reference
  const grid = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
  scene.add(grid);

  // Axes helper
  const axes = new THREE.AxesHelper(2);
  scene.add(axes);

  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Cross-link panel toggle
  const linkPanel = document.getElementById('crosslinks');
  const btnCollapse = document.getElementById('btn-collapse-links') as HTMLButtonElement | null;
  const btnExpand = document.getElementById('btn-expand-links') as HTMLButtonElement | null;

  function setLinksCollapsed(collapsed: boolean) {
    if (!linkPanel || !btnExpand) return;
    if (collapsed) {
      linkPanel.classList.add('collapsed');
      btnExpand.style.display = 'flex';
    } else {
      linkPanel.classList.remove('collapsed');
      btnExpand.style.display = 'none';
    }
  }

  btnCollapse?.addEventListener('click', () => setLinksCollapsed(true));
  btnExpand?.addEventListener('click', () => setLinksCollapsed(false));

  // Default collapsed on mobile
  if (window.innerWidth <= 768) {
    setLinksCollapsed(true);
  }
}

init();
