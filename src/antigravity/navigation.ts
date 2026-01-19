import * as THREE from 'three';
import Agent from './agent';

export function setupNavigation(scene: THREE.Scene, model: THREE.Object3D, camera: THREE.PerspectiveCamera) {
    const agent = new Agent(model);
    agent.initBVH();

    // Add collider to scene for visualization (optional, hidden by default)
    scene.add(agent.collider);

    // Input state
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
    };

    window.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': keys.forward = true; break;
            case 'KeyS': keys.backward = true; break;
            case 'KeyA': keys.left = true; break;
            case 'KeyD': keys.right = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': keys.forward = false; break;
            case 'KeyS': keys.backward = false; break;
            case 'KeyA': keys.left = false; break;
            case 'KeyD': keys.right = false; break;
        }
    });

    // Mouse Look / Pointer Lock
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const PI_2 = Math.PI / 2;
    const sensitivity = 0.002;

    document.body.addEventListener('click', () => {
        document.body.requestPointerLock();
    });

    document.body.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement !== document.body) return;

        euler.setFromQuaternion(camera.quaternion);

        euler.y -= event.movementX * sensitivity;
        euler.x -= event.movementY * sensitivity;

        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));

        camera.quaternion.setFromEuler(euler);
    });

    const playerDirection = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Update function to be called per frame
    return (delta: number) => {
        // 1. Calculate direction from camera and keys
        playerDirection.set(0, 0, 0);

        if (keys.forward) playerDirection.z -= 1;
        if (keys.backward) playerDirection.z += 1;
        if (keys.left) playerDirection.x -= 1;
        if (keys.right) playerDirection.x += 1;

        playerDirection.normalize();

        // We want 'Forward' (W) to be where the camera is looking.
        // Get camera forward vector
        const camForward = new THREE.Vector3();
        camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camForward, up).normalize();

        // Compose final direction
        const finalDir = new THREE.Vector3();
        finalDir.addScaledVector(camForward, -playerDirection.z);
        finalDir.addScaledVector(camRight, playerDirection.x);

        // 2. Update physics
        agent.update(delta, finalDir);


        // 3. Sync Camera to Player
        // FPS-like camera position:
        camera.position.lerp(
            new THREE.Vector3().copy(agent.collider.position).add(new THREE.Vector3(0, 1.25, 0)),
            0.5
        );
        // Note: Camera rotation is handled by the mousemove event listener

        return agent.collider.position;
    };
}


export default setupNavigation;
