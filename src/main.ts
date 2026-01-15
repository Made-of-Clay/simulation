import {
    LoadingManager,
    PCFSoftShadowMap,
    WebGLRenderer,
} from 'three';
import Stats from 'stats.js';
import './style.css';
import { addLights } from './addLights';
import { addHelpers } from './addHelpers';
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

addLights();

loader.load('/models/lowpoly1.gltf', (gltf) => {
    scene.add(gltf.scene);
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

    camera.tick(renderer);

    renderer.render(scene, camera.instance);
    stats.end();
}

tick();
