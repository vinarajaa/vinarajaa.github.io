import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8d9a0); // Gradient-like peach background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = true;
scene.add(dirLight);

// Plane (Ground)
const planeGeometry = new THREE.PlaneGeometry(50, 50);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xf9a875 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.receiveShadow = true;
scene.add(plane);

// Placeholder Tiles
for (let i = -3; i <= 3; i++) {
  const tileGeometry = new THREE.BoxGeometry(1, 0.1, 1);
  const tileMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const tile = new THREE.Mesh(tileGeometry, tileMaterial);
  tile.position.set(i * 1.5, 0.05, 0);
  tile.castShadow = true;
  scene.add(tile);
}

// Placeholder Trees (Simple Low-Poly)
for (let i = 0; i < 5; i++) {
  const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.set(Math.random() * 20 - 10, 0.5, Math.random() * 20 - 10);
  scene.add(trunk);

  const leavesGeometry = new THREE.ConeGeometry(0.8, 2, 8);
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0xf9f871 });
  const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
  leaves.position.set(trunk.position.x, 1.8, trunk.position.z);
  scene.add(leaves);
}

// 3D Text (BRUNO SIMON)
const fontLoader = new FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
  const textGeometry = new TextGeometry('YOUR NAME', {
    font: font,
    size: 1,
    height: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 5
  });

  const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(-4, 0.5, -3);
  textMesh.castShadow = true;
  scene.add(textMesh);
});

// Placeholder Car (Cube for now)
const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const car = new THREE.Mesh(carGeometry, carMaterial);
car.position.set(0, 0.25, 2);
car.castShadow = true;
scene.add(car);

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Responsive Canvas
window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});