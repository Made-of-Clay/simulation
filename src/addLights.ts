import { AmbientLight, AdditiveBlending, BufferGeometry, CanvasTexture, DirectionalLight, DirectionalLightHelper, Float32BufferAttribute, PointLight, PointLightHelper, Points, PointsMaterial } from 'three'
import { getGui } from './getGui'
import { getScene } from './getScene';

function getFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    // Fallback if context is null
    if (!context) return null;

    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new CanvasTexture(canvas);
    return texture;
}

export function addLights() {
    const gui = getGui();
    const lightsFolder = gui.addFolder('Lights');

    const ambientLight = new AmbientLight('white', 0.25);

    lightsFolder.add(ambientLight, 'visible').name('Ambient Light');

    // Fireplace Flame
    const fireplacePointLight = new PointLight('#ffb172', 20, 100);
    fireplacePointLight.position.set(-18, 2.5, 5.3);
    fireplacePointLight.castShadow = true;
    fireplacePointLight.shadow.radius = 4;
    fireplacePointLight.shadow.camera.near = 0.1;
    fireplacePointLight.shadow.camera.far = 1000;
    fireplacePointLight.shadow.mapSize.width = 2048;
    fireplacePointLight.shadow.mapSize.height = 2048;

    lightsFolder.add(fireplacePointLight, 'visible').name('Fireplace Point Light');
    lightsFolder.add(fireplacePointLight.position, 'x').min(-30).max(30).step(0.01).name('Point Light Position X');
    lightsFolder.add(fireplacePointLight.position, 'y').min(-30).max(30).step(0.01).name('Point Light Position Y');
    lightsFolder.add(fireplacePointLight.position, 'z').min(-30).max(30).step(0.01).name('Point Light Position Z');

    // Add particles for subtle fire
    const particleCount = 25;
    const particleGeometry = new BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleInitialY = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 0.85;
        const y = Math.random() * 0.8;
        const z = (Math.random() - 0.5) * 0.85;

        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;

        particleSpeeds[i] = 0.5 + Math.random() * 1.0;
        particleInitialY[i] = y;
    }

    particleGeometry.setAttribute('position', new Float32BufferAttribute(particlePositions, 3));

    const fireTexture = getFireTexture();
    const fireplaceParticles = new Points(
        particleGeometry,
        new PointsMaterial({
            color: '#ff6600',
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            map: fireTexture || undefined,
            blending: AdditiveBlending,
            depthWrite: false
        })
    );
    fireplaceParticles.position.copy(fireplacePointLight.position);

    const fireplacePointLightHelper = new PointLightHelper(fireplacePointLight, 0.25, 'orange');
    fireplacePointLightHelper.visible = false;
    lightsFolder.add(fireplacePointLightHelper, 'visible').name('Fireplace Point Light Helper');

    const dirLight = new DirectionalLight('#dce6f7', 3);
    lightsFolder.add(dirLight, 'intensity').min(0).max(100).step(0.01).name('Directional Light Intensity');
    dirLight.position.set(0, 10, 30);
    dirLight.castShadow = true;
    dirLight.shadow.radius = 4;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const dirLightHelper = new DirectionalLightHelper(dirLight);
    lightsFolder.add(dirLightHelper, 'visible').name('Directional Light Helper');

    const scene = getScene();
    scene.add(ambientLight, fireplacePointLight, fireplacePointLightHelper, dirLight, dirLightHelper, fireplaceParticles);

    return (delta: number) => {
        const positions = particleGeometry.attributes.position.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
            // Move up
            positions[i * 3 + 1] += particleSpeeds[i] * delta;

            // Flicker flickering light intensity
            if (i === 0) { // Just use one particle loop to trigger light flicker to save perf
                fireplacePointLight.intensity = 20 + (Math.random() - 0.5) * 5;
            }

            // Reset if too high
            if (positions[i * 3 + 1] > 1.2) {
                positions[i * 3 + 1] = 0;
                positions[i * 3] = (Math.random() - 0.5) * 0.5; // New random X
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // New random Z
            }
        }
        particleGeometry.attributes.position.needsUpdate = true;
    };
}
