
Antigravity agent - integration notes
===================================

Purpose
- Create a small, in-repo TypeScript scaffold that implements navigation and collision
  helpers using `three-mesh-bvh` so characters can navigate the `lowpoly1` scene.

Files added
- `src/antigravity/agent.ts` — core agent and BVH initialization.
- `src/antigravity/navigation.ts` — simple setup function called from `main.ts`.
- `src/antigravity/types.d.ts` — lightweight module declaration for `three-mesh-bvh`.

Why these locations?
- `src/antigravity/` (recommended): Keeps the code in the same compilation context as the app
  so you can import scene objects directly and run the agent in the main browser thread.

Benefits of `src/antigravity/` (what we used)
- Direct access to the scene, GLTF models, and renderer without cross-project build steps.
- Easier iterative development: changes hot-reload under `vite` dev server.
- Simpler proof-of-concept deployment as part of the same static app.

Package manager and scripts
- Use `pnpm` for installing and running scripts in this project. Example commands:

```bash
pnpm install
pnpm run dev
pnpm run build
```

- If you prefer `npm`, the same scripts work via `npm run <script>` but `pnpm` is recommended
  for faster installs and deterministic node_modules layout during iterative development.

Notes
- The scaffold exposes the agent on `window.antigravityAgent` for debugging.
- `three-mesh-bvh` is added to `package.json`; run `pnpm install` locally to install dependencies.
- The agent uses the movement example from three-mesh-bvh as a reference; the provided
  functions are a scaffold and intentionally minimal to keep integration safe and local.
- Stay on this git branch (`antigravity`)