import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

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
    onFloor = false;

    // Configuration
    gravity = -30;
    playerSpeed = 10;
    physicsSteps = 5;

    // Temp variables for math
    private tempVector = new THREE.Vector3();
    private tempVector2 = new THREE.Vector3();
    private tempBox = new THREE.Box3();
    private tempMat = new THREE.Matrix4();
    private tempSegment = new THREE.Line3();

    constructor(root: THREE.Object3D) {
        this.root = root;
        // Create a simple capsule collider for the player
        // Height 1.5, radius 0.35 roughly fits a humanoid
        const geometry = new THREE.CapsuleGeometry(0.35, 1.5, 4, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false });
        this.collider = new THREE.Mesh(geometry, material);
        // Position it nicely above ground
        this.collider.geometry.translate(0, 0.75 + 0.35, 0);
        this.collider.position.set(0, 5, 0); // Start high to avoid falling through buffer logic
    }

    private findFirstMesh(): THREE.Mesh | undefined {
        let found: THREE.Mesh | undefined;
        this.root.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !found) found = child as THREE.Mesh;
        });
        return found;
    }

    initBVH() {
        this.mesh = this.findFirstMesh();
        if (!this.mesh) {
            console.warn('Antigravity Agent: no mesh found to build BVH from');
            return;
        }

        const geom: any = this.mesh.geometry;
        if (!geom.boundsTree) {
            // Build BVH and attach as `boundsTree` on geometry (convention used by the library)
            geom.boundsTree = new MeshBVH(geom, { lazyGeneration: false });
        }
    }

    update(delta: number, playerDirection: THREE.Vector3) {
        if (!this.mesh) return;

        const collider = this.collider;
        const bvhMesh = this.mesh;

        // 1. Apple gravity
        this.velocity.y += this.onFloor ? 0 : delta * this.gravity;

        // 2. Apply player input acceleration
        // (For simplicity we set velocity directly from input, but could integrate acceleration)
        this.velocity.x = playerDirection.x * this.playerSpeed;
        this.velocity.z = playerDirection.z * this.playerSpeed;

        // 3. Move the collider
        collider.position.addScaledVector(this.velocity, delta);

        // 4. Collision Detection
        this.onFloor = false;

        // Perform multiple steps for stability
        for (let i = 0; i < this.physicsSteps; i++) {
            // @ts-ignore
            if (!bvhMesh.geometry.boundsTree) continue;

            this.tempBox.makeEmpty();
            this.tempMat.copy(collider.matrixWorld).invert();
            this.tempSegment.copy(this.tempSegment);

            // Get the collider's capsule structure
            // We can use the bvh shapecast to find intersections
            // @ts-ignore
            bvhMesh.geometry.boundsTree.shapecast({

                intersectsBounds: (box: THREE.Box3) => {
                    const bounds = box;
                    // Check if capsule bounds intersect node bounds
                    // This is a simplified check, ideally transform capsule to local space of bvh
                    // For now, simpler approach: use standard THREE raycasting or just treat environment as static world
                    // The standard three-mesh-bvh 'characterMovement' example uses a more robust shapecast.
                    // Let's implement that simplified:
                    return box.intersectsBox(this.tempBox.setFromObject(collider));
                },

                intersectsTriangle: (tri: any) => {
                    // Update triangle to world space
                    tri.a.applyMatrix4(bvhMesh.matrixWorld);
                    tri.b.applyMatrix4(bvhMesh.matrixWorld);
                    tri.c.applyMatrix4(bvhMesh.matrixWorld);

                    // Check intersection with capsule
                    const separation = new THREE.Vector3();
                    const start = this.tempVector.set(0, 0, 0);
                    const end = this.tempVector2.set(0, 0, 0);
                    // Helper to get capsule ends
                    this.getColliderEnds(collider, start, end);

                    const closestPoint = new THREE.Vector3();
                    tri.closestPointToSegment(new THREE.Line3(start, end), closestPoint);

                    // Sphere check at closest point
                    const radius = 0.35; // Matches capsule radius
                    const dist = closestPoint.distanceToSquared(collider.position); // This is approximate, really need distance to segment
                    // Better approach: use the library example's logic which is robust.

                    // RE-IMPLEMENTING with the standard shapecast logic pattern for robustness:
                    const triPoint = new THREE.Vector3();
                    const capsulePoint = new THREE.Vector3();
                    const distance = tri.closestPointToSegment(new THREE.Line3(start, end), triPoint, capsulePoint);
                    if (distance < radius) {
                        const depth = radius - distance;
                        const direction = capsulePoint.sub(triPoint).normalize();
                        this.tempSegment.set(0, 0, 0);
                        this.tempSegment.start.copy(direction).multiplyScalar(depth);

                        // Move collider out
                        collider.position.add(this.tempSegment.start);

                        // Check if this was a floor collision
                        if (direction.y > 0.5) {
                            this.onFloor = true;
                            this.velocity.y = Math.max(0, this.velocity.y);
                        }
                    }
                }
            });
        }

        // Refined collision using the robust method:
        // Since we are writing this from scratch based on the prompt, let's substitute the complex manual shapecast 
        // with the 'computeBoundsTree' result usage if simpler, but shapecast is the recommended way.
        // Let's do a simplified approach: just ensure we don't fall through floor for now if complex physics is too much code.
        // Actually, let's use the provided logic in the official example which is concise.

        this.updateCollision(delta, bvhMesh);
    }

    // Helper to extract capsule segment world positions
    private getColliderEnds(collider: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
        // geometry is centered, so ends are at +height/2 and -height/2 along Y, minus radius caps
        // Total height 1.5 + 2*radius (0.35) = 2.2 ?? Or is CapsuleGeometry arguments radius, length?
        // ThreeJS CapsuleGeometry(radius, length). Total height is length + 2*radius.
        // We used radius=0.35, length=1.5. Total height = 2.2.
        // The cylinder part is length 1.5.
        // Local Y axis.
        start.set(0, -1.5 / 2, 0);
        end.set(0, 1.5 / 2, 0);

        start.applyMatrix4(collider.matrixWorld);
        end.applyMatrix4(collider.matrixWorld);
    }

    private updateCollision(delta: number, bvhMesh: THREE.Mesh) {
        // @ts-ignore
        const bvh = bvhMesh.geometry.boundsTree;
        if (!bvh) return;

        const collider = this.collider;
        const radius = 0.35;
        const segmentLen = 1.5;

        this.tempBox.makeEmpty();
        this.tempBox.expandByObject(collider);
        // Add a small margin for movement
        this.tempBox.min.addScalar(-0.1);
        this.tempBox.max.addScalar(0.1);

        bvh.shapecast({
            intersectsBounds: (box: THREE.Box3) => {
                return box.intersectsBox(this.tempBox);
            },
            intersectsTriangle: (tri: any) => {
                // Apply mesh world matrix to triangle
                tri.a.applyMatrix4(bvhMesh.matrixWorld);
                tri.b.applyMatrix4(bvhMesh.matrixWorld);
                tri.c.applyMatrix4(bvhMesh.matrixWorld);

                // Get capsule segment in world space
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

                    collider.position.addScaledVector(direction, depth);

                    if (direction.y > 0.5) {
                        this.onFloor = true;
                        this.velocity.y = Math.max(0, this.velocity.y);
                    }
                }
            }
        });
    }

    jump() {
        if (this.onFloor) {
            this.velocity.y = 10;
            this.onFloor = false;
        }
    }
}

export default Agent;
