declare module 'three-mesh-bvh' {
  export class MeshBVH {
    constructor(geometry: any, options?: any);
  }
  export function acceleratedRaycast(this: any, ...args: any[]): any;
  export default MeshBVH;
}
