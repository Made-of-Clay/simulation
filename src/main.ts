import {
    Clock,
    LoadingManager,
    PCFSoftShadowMap,
    WebGLRenderer,
} from 'three';
import Stats from 'stats.js';
import './style.css';
import { addLights } from './addLights';
import { addHelpers } from './addHelpers';
import { setupNavigation } from './antigravity/navigation';
import { getScene } from './getScene';
import { ProjectCamera } from './ProjectCamera';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
const scene = getScene();

const loadingManager = new LoadingManager(
    console.log,
    (_url, loaded, total) => console.log(`Loading ${loaded} / ${total}`),
    console.error,
);
const loader = new GLTFLoader(loadingManager);

const fireplaceUpdate = addLights();

let navigationUpdate: ((delta: number) => void) | undefined;
const clock = new Clock();

// loader.load('/models/lowpoly1.gltf', (gltf) => {
loader.load('/scene.gltf', (gltf) => {
    scene.add(gltf.scene);
    gltf.scene.traverse((child) => {
        if (child.name === 'Object_13') {
            console.log(child)
            child.castShadow = true; // fireplace
            child.receiveShadow = true;
        }
    });
    // Initialize the Antigravity navigation agent for the loaded environment.
    // This wires the BVH-based helpers (three-mesh-bvh) into the runtime.
    try {
        navigationUpdate = setupNavigation(scene, gltf.scene, camera.instance);
        // Disable OrbitControls to let the agent control the camera
        camera.setControlsEnabled(false);
    } catch (e) {
        console.warn('Failed to setup Antigravity navigation:', e);
    }
});

const camera = new ProjectCamera(canvas);
scene.add(camera.instance);

addHelpers();

// ===== 📈 STATS & CLOCK =====
const stats = new Stats();
document.body.appendChild(stats.dom);

function tick() {
    requestAnimationFrame(tick);

    stats.begin();

    const delta = clock.getDelta();
    if (navigationUpdate) {
        navigationUpdate(delta);
    }
    if (fireplaceUpdate) {
        fireplaceUpdate(delta);
    }

    camera.tick(renderer);

    renderer.render(scene, camera.instance);
    stats.end();
}

tick();
