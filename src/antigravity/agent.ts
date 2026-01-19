import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Patch the raycast implementation for accelerated queries. This mirrors the
// setup used in the three-mesh-bvh examples.
try {
    // @ts-ignore
    (THREE.Mesh as any).prototype.raycast = acceleratedRaycast;
} catch (e) {
    // non-fatal in dev if patched multiple times
}

// Agent: BVH initialization and navigation scaffold
// Uses the three-mesh-bvh character movement example as a reference:
// https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/characterMovement.js#L193
export class Agent {
    root: THREE.Object3D;
    mesh?: THREE.Mesh;
    collider: THREE.Mesh;
    velocity = new THREE.Vector3();

    // Configuration
    playerSpeed = 10;
    physicsSteps = 5;

    // Temp variables for math
    private tempVector = new THREE.Vector3();
    private tempVector2 = new THREE.Vector3();
    private tempBox = new THREE.Box3();

    constructor(root: THREE.Object3D) {
        this.root = root;
        // Create a simple capsule collider for the player
        // Height 1.5, radius 0.35 roughly fits a humanoid
        const geometry = new THREE.CapsuleGeometry(0.35, 1.5, 4, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false });
        this.collider = new THREE.Mesh(geometry, material);
        // Position it nicely above ground
        this.collider.geometry.translate(0, 0.75 + 0.35, 0);
        this.collider.position.set(0, 3, 0); // Start high to avoid falling through buffer logic
    }



    initBVH() {
        const geometries: THREE.BufferGeometry[] = [];
        this.root.updateMatrixWorld(true);

        this.root.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
                // Ignore the agent's own collider if it accidentally got into the root (unlikely but safe)
                if (mesh === this.collider) return;

                const clonedGeom = mesh.geometry.clone();
                // Bake world transform into geometry so we have a single world-space collider
                clonedGeom.applyMatrix4(mesh.matrixWorld);
                for (const key in clonedGeom.attributes) {
                    if (key !== 'position' && key !== 'index') {
                        clonedGeom.deleteAttribute(key);
                    }
                }
                geometries.push(clonedGeom);
            }
        });

        if (geometries.length === 0) {
            console.warn('Antigravity Agent: no meshes found to build BVH from');
            return;
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
        if (!mergedGeometry) {
            console.warn('Antigravity Agent: failed to merge geometries');
            return;
        }

        (mergedGeometry as any).boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });
        // Create a standalone mesh for the collider, not added to scene, just for data
        this.mesh = new THREE.Mesh(mergedGeometry);
    }

    update(delta: number, playerDirection: THREE.Vector3) {
        if (!this.mesh) return;

        const collider = this.collider;
        const bvhMesh = this.mesh;

        // 1. Apply player input acceleration
        // (For simplicity we set velocity directly from input, but could integrate acceleration)
        this.velocity.x = playerDirection.x * this.playerSpeed;
        this.velocity.z = playerDirection.z * this.playerSpeed;
        // Ensure vertical velocity is zeroed if we want strictly horizontal movement from input, 
        // though it was only gravity affecting it before.
        this.velocity.y = 0;

        // 2. Move the collider
        collider.position.addScaledVector(this.velocity, delta);

        // 3. Collision Detection
        // Use the simplified shapecast loop update call if needed or just rely on the above loop.
        // We merged logic into update() main loop for clarity based on previous file structure.
        // Actually, the previous file had a separate updateCollision() calls. 
        // Let's keep using updateCollision() or just inline it properly.
        // The previous code had BOTH a big loop with shapecast AND a call to this.updateCollision().
        // That seemed redundant. Let's clean it up to use just one robust collision pass.
        // I will delegate to updateCollision logic for the single source of truth and remove the redundant loop in 3.

        this.updateCollision(bvhMesh);
    }

    // Helper to extract capsule segment world positions
    private getColliderEnds(collider: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
        start.set(0, -1.5 / 2, 0);
        end.set(0, 1.5 / 2, 0);

        start.applyMatrix4(collider.matrixWorld);
        end.applyMatrix4(collider.matrixWorld);
    }

    private updateCollision(bvhMesh: THREE.Mesh) {
        // @ts-ignore
        const bvh = bvhMesh.geometry.boundsTree;
        if (!bvh) return;

        const collider = this.collider;
        const radius = 0.35;

        // We can do multiple micro-steps if delta is large, but for now simple single pass
        // or the 5 steps defined in physicsSteps.
        const steps = this.physicsSteps;

        for (let i = 0; i < steps; i++) {
            this.tempBox.makeEmpty();
            this.tempBox.expandByObject(collider);
            this.tempBox.min.addScalar(-0.1);
            this.tempBox.max.addScalar(0.1);

            bvh.shapecast({
                intersectsBounds: (box: THREE.Box3) => {
                    return box.intersectsBox(this.tempBox);
                },
                intersectsTriangle: (tri: any) => {
                    tri.a.applyMatrix4(bvhMesh.matrixWorld);
                    tri.b.applyMatrix4(bvhMesh.matrixWorld);
                    tri.c.applyMatrix4(bvhMesh.matrixWorld);

                    const start = this.tempVector;
                    const end = this.tempVector2;
                    this.getColliderEnds(collider, start, end);
                    const segment = new THREE.Line3(start, end);

                    const triPoint = new THREE.Vector3();
                    const capsPoint = new THREE.Vector3();

                    const distance = tri.closestPointToSegment(segment, triPoint, capsPoint);
                    if (distance < radius) {
                        const depth = radius - distance;
                        const direction = capsPoint.sub(triPoint).normalize();

                        // User requested to re-add floor push-back and fix sinking issues.
                        // We strictly disallow downward pushback to prevent "sinking" when hitting slightly angled walls.
                        if (direction.y < 0) {
                            direction.y = 0;
                            direction.normalize();
                        }

                        // Reduce pushback to half as requested
                        collider.position.addScaledVector(direction, depth * 0.5);
                    }
                }
            });
        }
    }
}

export default Agent;
