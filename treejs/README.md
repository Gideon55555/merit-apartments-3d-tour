# Merit Properties — 3D Apartment Tour

A scroll-driven 3D walkthrough of a 44 m² one-bedroom apartment, built with Next.js, Three.js and Lenis.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

| File | Role |
|---|---|
| `app/components/ScrollExperience.tsx` | Page UI, Lenis smooth scrolling and the single frame loop that drives the camera and copy |
| `app/components/ApartmentScene.tsx` | Renderer, post-processing (MSAA + GTAO), quality tiers, render-on-demand |
| `app/components/apartment/apartment.ts` | The apartment model, measured from `public/floorplan.png` |
| `app/components/apartment/kit.ts` | Geometry helpers: walls with openings, glazing, plants, curtains, lamps |
| `app/components/apartment/materials.ts` / `textures.ts` | Materials and procedurally generated textures (no image assets) |
| `app/components/apartment/environment.ts` | Sky, sun, image-based lighting, trees |
| `app/components/apartment/cameraPath.ts` | Camera route and timing: one spline, eased with a monotone cubic so it never jerks or reverses |

### Editing the camera route

Each entry in `KEYS` pins a camera position, look-at target and FOV to a scroll position `u`. Pairs of keys
with the copy on screen form a "hold" and must match `HOLDS` (and the order of `SCENES` in `ScrollExperience.tsx`).

### Dev-only URL parameters

- `?u=5.6` — jump to a point on the path
- `?debug` — report camera clearance to geometry and turn rate along the whole path
- `?quality=high|low` — force a quality tier (disables adaptive downgrade)

Scene deep links (`/#kitchen`, `/#bedroom`, …) work in production too.
