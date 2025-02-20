import * as THREE from 'three';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xECD06F); // Soft yellow background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5); // Isometric view
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Full-Screen Plane
const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xDF6C4F }); // Warm coral color
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Lay flat
scene.add(plane);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Raycaster & Mouse for Interactivity
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Clickable Boxes (Navigation)
const pages = [
  { name: 'About', position: [-3, 0.5, -2], link: 'about.html' },
  { name: 'Work', position: [0, 0.5, -2], link: 'work.html' },
  { name: 'Contact', position: [3, 0.5, -2], link: 'contact.html' }
];

const clickableObjects = [];

pages.forEach(page => {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF }); // White for contrast
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(...page.position);
  box.userData = { link: page.link, name: page.name };
  scene.add(box);
  clickableObjects.push(box);

  // Add Text Label (using canvas texture)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '30px Arial';
  ctx.fillStyle = '#000';
  ctx.fillText(page.name, 10, 50);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(2, 1, 1);
  label.position.set(page.position[0], page.position[1] + 1, page.position[2]);
  scene.add(label);
});

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
    obj.material.color.set(0xFFFFFF); // Default color
  });

  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0x00ff00); // Highlight on hover
  }
});

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();