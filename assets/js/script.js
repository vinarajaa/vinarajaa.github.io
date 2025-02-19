document.addEventListener("DOMContentLoaded", function () {
    let typed = new Typed("#typed-text", {
        strings: ["a Web Developer", "a Tech Enthusiast", "a Problem Solver"],
        typeSpeed: 50,
        backSpeed: 30,
        loop: true
    });

});
const simplex = new SimplexNoise();

function App(conf) {
    conf = {
        fov: 75,
        cameraZ: 150,
        tubeRadius: 3,
        tubeLength: 400,
        pRadius: true,
        resY: 6,
        resX: 12,
        noiseCoef: 30,
        timeCoef: 20,
        heightCoef: 30,
        colors: [0x390009, 0xe52643, 0xeadee0, 0xffffff],
        background: 0x000000,
        ambientColor: 0x909090,
        lightIntensity: 1,
        light1Color: 0x980AF1,
        light2Color: 0x66B6EC,
        light3Color: 0xffffff,
        ...conf
    };

    let renderer, scene, camera;
    let width, height, wWidth, wHeight;
    let light1, light2, light3;
    let objects, noiseConf = {};
    let cscale = chroma.scale(conf.colors);

    const mouse = new THREE.Vector2();
    
    init();

    function init() {
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById(conf.el),
            antialias: true,
        });
        camera = new THREE.PerspectiveCamera(conf.fov);
        camera.position.z = conf.cameraZ;

        updateSize();
        window.addEventListener('resize', updateSize, false);

        document.addEventListener('mousemove', e => {
            mouse.x = (e.clientX / width) * 2 - 1;
            mouse.y = -(e.clientY / height) * 2 + 1;
        });

        initScene();
        animate();
    }

    function initScene() {
        scene = new THREE.Scene();
        if (conf.background) scene.background = new THREE.Color(conf.background);
        initLights();
        initObjects();
        camera.position.z = 50;
        camera.position.y = -100;
        camera.lookAt(new THREE.Vector3(0, 50, 0));
    }

    function initLights() {
        scene.add(new THREE.AmbientLight(conf.ambientColor));

        const z = 50;
        const lightDistance = 500;
        light1 = new THREE.PointLight(conf.light1Color, conf.lightIntensity, lightDistance);
        light1.position.set(0, wHeight / 2, z);
        scene.add(light1);
        light2 = new THREE.PointLight(conf.light2Color, conf.lightIntensity, lightDistance);
        light2.position.set(0, -wHeight / 2, z);
        scene.add(light2);
        light3 = new THREE.PointLight(conf.light3Color, conf.lightIntensity, lightDistance);
        light3.position.set(wWidth / 2, 0, z);
        scene.add(light3);
    }

    function initObjects() {
        updateNoise();
        const nx = Math.round(wWidth / conf.resX) + 1;
        const ny = Math.round(conf.tubeLength / conf.resY) + 1;
        objects = [];
        let tube, color;
        for (let i = 0; i < nx; i++) {
            color = cscale(THREE.Math.randFloat(0, 1)).hex();
            tube = new Tube(-wWidth / 2 + i * conf.resX, -wHeight / 2, conf.tubeLength, ny, conf.tubeRadius, color, noiseConf);
            objects.push(tube);
            scene.add(tube.mesh);
        }
    }

    function updateNoise() {
        noiseConf.coef = conf.noiseCoef * 0.00015;
        noiseConf.height = conf.heightCoef;
        noiseConf.time = Date.now() * conf.timeCoef * 0.000005;
        noiseConf.mouseX = mouse.x / 3;
        noiseConf.mouseY = mouse.y / 3;
    }

    function animate() {
        requestAnimationFrame(animate);

        updateNoise();
        for (let i = 0; i < objects.length; i++) {
            objects[i].update(conf);
        }

        renderer.render(scene, camera);
    }

    function updateSize() {
        width = window.innerWidth;
        height = window.innerHeight;
        if (renderer && camera) {
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            const wsize = getRendererSize();
            wWidth = wsize[0];
            wHeight = wsize[1];
        }
    }

    function getRendererSize() {
        const cam = new THREE.PerspectiveCamera(camera.fov, camera.aspect);
        const vFOV = (cam.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFOV / 2) * Math.abs(conf.cameraZ);
        const width = height * cam.aspect;
        return [width, height];
    }
}

/** Tube class */
class Tube {
    constructor(x, y, l, segments, radius, color, noise) {
        this.segments = segments;
        this.radialSegments = 8;
        this.radius = radius;

        this.curve = new THREE.Curve();
        this.geometry = new THREE.TubeBufferGeometry(this.curve, segments, radius, this.radialSegments, false);
        this.material = new THREE.MeshStandardMaterial({ color });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }
    update(conf) {
        this.radius = conf.tubeRadius;
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.normal.needsUpdate = true;
    }
}

App({ el: 'background' });