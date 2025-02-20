document.addEventListener('DOMContentLoaded', () => {
  // Your existing Three.js code here
    // Scene, Camera, Renderer


  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

// Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create Terrain
const geometry = new THREE.PlaneGeometry(50, 50, 100, 100);
const material = new THREE.MeshStandardMaterial({
  color: 0x228B22,
  wireframe: false,
  flatShading: true,
});
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Randomize Terrain Heights
for (let i = 0; i < geometry.attributes.position.count; i++) {
  const z = Math.random() * 3;
  geometry.attributes.position.setZ(i, z);
}
geometry.computeVertexNormals();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Camera Position
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
});