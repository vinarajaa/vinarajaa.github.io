import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Raycaster & Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Plane Geometry (Static)
const geometry = new THREE.PlaneGeometry(5, 5, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: 0x0077ff, side: THREE.DoubleSide });
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Clickable Boxes (Navigation)
const pages = [
  { name: 'About', position: [-2, 1, 0], link: 'about.html' },
  { name: 'Work', position: [0, 1, 0], link: 'work.html' },
  { name: 'Contact', position: [2, 1, 0], link: 'contact.html' }
];

const clickableObjects = [];

pages.forEach(page => {
  const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.2);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xff5555 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(...page.position);
  box.userData = { link: page.link, name: page.name }; // Store link and name
  scene.add(box);
  clickableObjects.push(box);

  // Add Text Label (optional using basic canvas texture)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '24px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(page.name, 10, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(1, 0.5, 1);
  label.position.set(...page.position, 0.6);
  scene.add(label);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// OrbitControls (Optional - can be removed for fixed view)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Responsive Canvas
window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Raycasting for Clicks
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);

  if (intersects.length > 0) {
    const { link } = intersects[0].object.userData;
    window.location.href = link; // Navigate to page
  }
});

// Raycasting for Hover Effects
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);

  clickableObjects.forEach(obj => {
    obj.material.color.set(0xff5555); // Default color
  });

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x00ff00); // Highlight on hover
  }
});

// Animation Loop (No plane rotation)
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();