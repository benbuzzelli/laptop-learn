# Dino Desk – Level Generation Refactor

Planning doc for replacing the current recursive-backtracking maze generator in Dino Dungeon with a rooms + corridors approach, so we can build real stealth-and-puzzle dungeons for older kids.

---

## Why Replace the Current Generator

The existing generator is an iterative recursive-backtracking maze. It works fine as a toddler-friendly maze game, but it has limits we're already hitting:

- **Every corridor is 1 wide.** There's no room to dodge a guard, hide behind a pillar, or stage a set piece.
- **Strict tree structure.** Exactly one path between any two cells. We turn off passage-widening in Hard mode so the door/key solvability proofs hold — that makes guards feel punishing because there's no alternate route.
- **No rooms.** Bosses, treasure rooms, crossroads, altars — none of these exist as spatial concepts. Everything is a tile in a corridor.
- **Constrained interactivity.** Pressure plates, push blocks, and guards all fight for space in the same narrow corridors. Pushing becomes risky, guards become blocking, etc.

For the dungeon-crawler audience (6–10 year olds per DUNGEON_CRAWLER.md), we want levels that feel like places — a room with an idol and a pressure plate, a corridor with a patrolling guard you have to sneak past, a stash room hidden behind a locked door.

---

## Target Approach: BSP Rooms + Corridors + Templates

Two-phase generation:

### Phase A: BSP layout
1. Start with the full grid as one rectangle.
2. Recursively split each rectangle in half (horizontal or vertical) until each piece is small enough to be a room (roughly 4×4 to 8×6 tiles).
3. In each leaf rectangle, carve out an inner room (smaller than the rectangle, random placement inside with a margin).
4. Connect rooms: for each BSP split, connect the two child regions with an L-shaped corridor (1–2 tiles wide) between the nearest edges of their rooms.

Output: a set of rooms and corridors on the grid, wall tiles everywhere else.

### Phase B: Content placement
On top of the BSP skeleton:
1. Identify a **start room** (far corner) and **exit room** (opposite far corner).
2. Find the path from start room to exit room through the corridor graph.
3. Place **keys → doors → plate → plate gate → exit** in the same progression pattern we have now, but anchored to rooms (a key in one room, the door it unlocks in a corridor).
4. Place **guards** inside rooms or corridor segments with enough width to patrol safely.
5. Place **treasures / blocks / decoration** in remaining rooms.

### Phase C: Room templates (stretch)
Instead of BSP producing plain rectangular rooms, each leaf rectangle can be stamped with a **hand-authored template** chosen from a library: "idol room", "pillar hall", "crossroads", "treasure stash". Templates are small grids of tile/feature IDs that get rotated/mirrored and dropped into the leaf.

This is what Spelunky and Enter the Gungeon do. It gives much more visual variety without sacrificing procedural generation.

---

## Why BSP Specifically

- Mature algorithm, lots of reference implementations (Roguebasin has a canonical one).
- Naturally produces rectangular rooms of varied sizes.
- Rooms have multiple entrances → multi-path layouts → guards and blocks become puzzle elements, not roadblocks.
- Fits our existing tile-grid rendering with zero changes to draw logic.
- Rooms give us anchors for decoration (pillars, statues, torches — all the stuff in the DUNGEON_CRAWLER.md Tier 1 list).
- The BSP tree itself can be used to drive progression ("the exit room is always the deepest leaf in the tree").

Not using WFC (Wave Function Collapse) — it's overkill for this, and the constraint-solver feel doesn't match the "rooms and corridors" dungeon idiom.

---

## How Existing Mechanics Map

| Feature | Current | BSP version |
|---|---|---|
| Maze cells | Tree of corridors | Rooms + corridors |
| Keys & doors | Door on path cell, key in before-region | Door on corridor between rooms, key inside a reachable room |
| Pressure plate + gate | Plate anywhere accessible, gate on path | Plate in a room, gate on a corridor exit |
| Push blocks | In dead-end branches | In rooms with space to push around pillars; some rooms can be Sokoban puzzles |
| Patrolling guards | Random walk for 2–4 tiles | Room-bounded patrol (guard paces along one wall of a room) or corridor patrol |
| Watchers | Off critical path only | Centered in rooms where their cone sweeps the room; never blocks a corridor alone |
| Hiding spots (future) | Not possible | Pillars, alcoves, tall grass placed via templates |
| Rolling boulders, spikes (future) | Awkward | Natural — place in rooms as hazards |

---

## Phased Build Plan

### Phase 1 — BSP skeleton behind a feature flag (1 session)
- Add `dungeonGenerator: 'tree' | 'bsp'` config, default to `tree`
- Implement `generateBSPRoom(level, difficulty)` returning the same `DungeonRoom` shape
- BSP split + room carving + L-shaped corridors, no content yet (walls + floor only)
- Reuse existing tile rendering

### Phase 2 — Port content placement (1–2 sessions)
- Move key/door/plate/gate/guard/treasure/block placement onto the BSP layout
- Keep the existing solvability verifier (it's agnostic to generator)
- Tune sizes: rooms 4×4 to 7×5, corridors 1 wide for now (2 wide later)
- Once stable, flip the flag and make BSP the default for Hard mode

### Phase 3 — Room templates (2 sessions)
- Define a template file format (JSON or TS literal): grid of tile IDs + feature anchors ("plate_here", "guard_spawn", etc.)
- Author ~8 starter templates: empty room, pillar hall, crossroads, idol room, treasure stash, guard barracks, narrow passage, open plaza
- Template picker biased by room position in the BSP tree (start room = empty, exit-room = "boss room", middle = random)

### Phase 4 — Widen corridors (small session)
- 2-wide corridors in rooms with guards — gives room to sneak around
- Requires reworking push-block placement to account for wider spaces (straightforward)

### Phase 5 — Special zone layouts (per DUNGEON_CRAWLER.md Phase 4)
- Ice caves: bias toward long straight corridors (slippery movement)
- Flooded dungeon: larger open rooms with fewer walls
- Lava tubes: single snaking corridor with timed hazards
- Stone temple (default): current BSP output
- Obsidian Fortress (final): hand-authored multi-screen layout

---

## Algorithm Sketch (Phase 1)

Pseudocode, roughly 150 lines of TS:

```typescript
interface BSPLeaf {
  x: number; y: number; w: number; h: number;  // bounding rectangle
  left?: BSPLeaf;
  right?: BSPLeaf;
  room?: { x: number; y: number; w: number; h: number };
}

function splitBSP(leaf: BSPLeaf, minSize = 5): void {
  if (leaf.w < minSize * 2 && leaf.h < minSize * 2) return;
  const splitHorizontal =
    leaf.h > leaf.w ? true :
    leaf.w > leaf.h ? false :
    Math.random() < 0.5;
  // ...pick split position with margin, create children, recurse
}

function carveRoom(leaf: BSPLeaf): void {
  if (leaf.left || leaf.right) return;  // interior node
  const roomW = randInt(4, leaf.w - 2);
  const roomH = randInt(3, leaf.h - 2);
  const roomX = leaf.x + randInt(1, leaf.w - roomW - 1);
  const roomY = leaf.y + randInt(1, leaf.h - roomH - 1);
  leaf.room = { x: roomX, y: roomY, w: roomW, h: roomH };
}

function connectSiblings(leaf: BSPLeaf, grid: Cell[][]): void {
  if (!leaf.left || !leaf.right) return;
  connectSiblings(leaf.left, grid);
  connectSiblings(leaf.right, grid);
  const from = pickCenter(leaf.left);
  const to = pickCenter(leaf.right);
  carveCorridor(grid, from, to);  // L-shaped
}
```

For a 15×11 grid (our current COLS×ROWS), BSP with minSize=5 yields roughly 2–4 rooms of size 3×3 to 5×5, connected by short corridors. We may want to go bigger — maybe 20×15 — to get 4–6 rooms per level.

---

## Open Questions

1. **Do we grow the grid?** 15×11 is tight for BSP. 20×14 would give us more room (pun intended). Impacts TILE size / layout on screen.
2. **Corridor width 1 or 2?** Two-wide corridors break push-block safety rules and need new verification, but they're much better for guards. Could mix: 1-wide early levels, 2-wide later.
3. **How many rooms per level?** 4–6 feels right. Scales by level?
4. **Do we keep the tree maze generator?** As the younger-kids version, yes (Easy/Medium mode). Hard mode gets BSP.
5. **Template authoring: JSON file or TS literal?** TS gives type-checking on feature anchors; JSON is easier to edit/hot-reload.
6. **Does the verifier need changes?** Probably not — it operates on the final grid regardless of how it was generated.

---

## Alternatives Considered

- **Cellular automata** — organic cave shapes. Good for ice caves / flooded zones later, but not a good default (hard to guarantee connectivity).
- **Wave Function Collapse** — too much machinery for what we need. Reserve for a late-stage rework if we ever add prop placement at the pixel level.
- **Hand-authored levels only** — reliable but throws away procedural replay. Probably the right choice for zone finale boss rooms but not for every level.
- **Drunkard's walk** — produces cave-like layouts. Cute but not a great dungeon shape.

---

## Success Criteria

We'll know the refactor worked if:
- Hard-mode levels feel like _places_ — you can describe the room you're in
- Guards are meaningful challenges, not blockers
- Push-block puzzles work in open spaces (Sokoban-style), not just dead-end branches
- We can drop in new zones (ice, jungle, flooded) as generator parameter tweaks, not rewrites
- Level-generation time stays under ~10ms per room
