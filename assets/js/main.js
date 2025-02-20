import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Plane Geometry
const geometry = new THREE.PlaneGeometry(5, 5, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, side: THREE.DoubleSide, wireframe: true });
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// OrbitControls (for interaction)
const controls = new OrbitControls(camera, renderer.domElement);

// Responsive Canvas
window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Simple rotation for effect
  plane.rotation.x += 0.005;
  plane.rotation.y += 0.005;

  controls.update();
  renderer.render(scene, camera);
}

animate();