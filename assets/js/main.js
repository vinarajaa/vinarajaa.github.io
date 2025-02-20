import * as THREE from 'three';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Set background to black

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 7); // Position camera above and at an angle
camera.lookAt(0, 0, 0); // Look at the center of the scene

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Raycaster & Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Plane Geometry (angled)
const planeGeometry = new THREE.PlaneGeometry(10, 10, 32, 32);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x003366, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate plane to lie flat
scene.add(plane);

// Clickable Boxes (Navigation)
const pages = [
  { name: 'About', position: [-3, 0.5, -2], link: 'about.html' },
  { name: 'Work', position: [0, 0.5, -2], link: 'work.html' },
  { name: 'Contact', position: [3, 0.5, -2], link: 'contact.html' }
];

const clickableObjects = [];

pages.forEach(page => {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(...page.position);
  box.userData = { link: page.link, name: page.name };
  scene.add(box);
  clickableObjects.push(box);

  // Add Text Label (using canvas texture)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '30px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(page.name, 10, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(2, 1, 1);
  label.position.set(page.position[0], page.position[1] + 1, page.position[2]);
  scene.add(label);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

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
    obj.material.color.set(0x8b0000); // Default color
  });

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x00ff00); // Highlight on hover
  }
});

// Animation Loop (No camera or object movement)
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();