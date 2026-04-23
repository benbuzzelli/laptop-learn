# Dino Desk – Dungeon Redesign

Planning doc for the next-generation dungeon experience. Supersedes the generation ideas in DUNGEON_CRAWLER.md (keeps those as longer-term aspirations).

---

## Core Pivot

Replace "walk the one-wide corridor and avoid guards" with **handcrafted arena-sized puzzle rooms stitched together into a short expedition**, with **stealth tools** to solve them and **meta-progression** via dino bones and Museum scrolls.

Species abilities are explicitly **not** required to finish any room (every room solvable on any dino). They may gate **optional content** — hidden scrolls, bonus bones — down the road.

---

## Gameplay Loop

```
Dino Valley → enter Deep Cave (Dungeon)
        ↓
  Pick expedition (3 available: Short / Standard / Long)
        ↓
  Room 1 → Room 2 → … → Room N (boss/final room)
        ↓
  Reward screen: bones earned, scrolls found, personal best
        ↓
  Return to Valley — bones/scrolls unlock things in the Museum
```

- **Short** expedition = 3 rooms, ~3 min total
- **Standard** = 5 rooms, ~6 min
- **Long** = 8 rooms, ~10 min

Getting spotted mid-room = restart that room only (not whole expedition). Getting spotted in the final room = restart the final room.

---

## A. Arena Rooms

Every room is a rectangular arena with a clear goal. No more corridors to nowhere.

### Room shape
- Base arena: 9×7 tiles of open floor
- Wall border (1 tile thick) defines the room
- 2–4 entry/exit doors placed on the edges
- Interior features placed inside the arena (pillars, plates, pits, etc.)

### Arena vocabulary (the features puzzles are built from)

| Feature | Role |
|---|---|
| Floor tile | Walkable |
| Wall | Blocks movement & guard vision |
| Pillar (1×1 wall in open space) | Hide spot — breaks vision line, lets player peek around |
| Tall grass patch | Hide spot — player invisible to guards while inside |
| Pit | Cannot cross (needs Ptera to glide, or a bridge) |
| Water tile | Cannot cross (needs Spino to swim, or a block bridge) |
| Pressure plate | Activates nearby gate, stays on while weighted |
| Sticky plate | Activates once, latches forever |
| Gate | Opens when paired plate is activated |
| Colored key + matching door | Single-use unlock |
| Push block | Sokoban-style — weighs plates, bridges pits |
| Crumbling tile | Crosses once, then it's gone (timing challenge) |
| Boulder | Guard-killing hazard, re-rolled on reset |
| Noise token | Throw it to distract a guard (breaks line to you) |

Not all features exist at launch — shipping list below.

### Guard behavior in arenas
- **Patrol**: walks a defined loop inside the room. Visible cone.
- **Watcher**: stationary, sweeps 360° or 180°. Visible cone.
- **Sleeper** (stretch): snoring, wakes if player walks adjacent.
- Guards can be **lost around pillars / in tall grass / via distraction** — timing isn't the only answer.

---

## C. Handcrafted Room Library

Rooms are **templates**, not procedurally generated interiors. The generator picks N templates and stitches them together (via doors) for each expedition.

### Template format
Each template is a TS literal:

```typescript
interface RoomTemplate {
  id: string;                   // 'stone-pillars', 'plate-quartet', ...
  difficulty: 1 | 2 | 3 | 4 | 5;// sort order for expedition ramp
  grid: string[];               // 9 rows of 7 chars each — see legend
  exits: Exit[];                // which edges have doors
  spawns: Spawn[];              // guards, treasures, bones, scrolls
  tags: string[];               // 'stealth', 'plate-puzzle', 'block-push'
}
```

Char legend:
- `.` floor, `#` wall, `P` pillar, `G` tall grass
- `_` pressure plate, `=` gate, `O` pit, `~` water
- `B` push block, `K` key, `D` door, `E` exit
- `S` start (where player enters)

### Launch library (15 rooms)

**Introductory (difficulty 1):**
1. *Simple Crossing* — open arena, one patrol guard, no features. Teaches cone avoidance.
2. *Pillar Dance* — 4 pillars in the middle, one watcher. Teaches hiding behind cover.
3. *The Long Hall* — two doors, guard patrols between them, two alcoves to duck into.

**Introductory puzzles (difficulty 2):**
4. *First Plate* — one plate, one gate, walk across to activate.
5. *Push and Step* — one block, one plate, one gate. Push block onto plate.
6. *Grass Patch* — open room with 3 grass patches and a watcher sweeping the center.

**Intermediate (difficulty 3):**
7. *Two-Key Lock* — two keys in the arena, two doors to the exit.
8. *Crumbling Floor* — single path of crumbling tiles over pits. Timing.
9. *Plate Sequence* — four plates, must step in the right order (shown by glyphs). Wrong order = reset.

**Challenge (difficulty 4):**
10. *Guard Relay* — two patrol guards with overlapping patrols. Find the gap.
11. *Block Bridge* — push a block into a pit to cross it.
12. *Watcher Maze* — grid of watchers, pillars to hide behind. Move only when safe.

**Finale (difficulty 5):**
13. *The Vault* — 3 plates, 3 gates, 2 guards, 2 blocks. Multi-step.
14. *Lava Chase* — crumbling floor + chasing guard. One shot.
15. *The Sleeping Rex* — giant dino boss, sneak across to grab an idol.

### Expedition ramp
- Short (3 rooms): difficulty 1, 2, 3
- Standard (5 rooms): difficulty 1, 2, 2, 3, 4
- Long (8 rooms): difficulty 1, 2, 2, 3, 3, 4, 4, 5
- Finale room (the final room of each expedition) is always tagged `finale` in the library

### Why this approach
- Each room has intent — it **teaches** or **tests** a specific idea
- Rooms can be iterated individually (bad room? swap it, no generator rewrite)
- Templates can carry per-species optional content without breaking solvability
- Generator becomes a **sequencer**, not a maze builder — far simpler

---

## D. Meta-Progression

Every expedition earns two currencies:

### Dino Bones (🦴)
- Earned by finishing rooms (base rate, bonus for no-detect)
- Spent in the **Museum** to unlock **display cases**
- Display cases are visual upgrades — each filled case adds decorations around the Museum
- Toddler-satisfying: every few runs unlocks something visible

### Ancient Scrolls (📜)
- Hidden in rooms (not on the critical path, optional to find)
- Spending scrolls unlocks **new room templates** for future expeditions
- Also reveal **lore** — a short sentence about dino civilization shows on collection
- This is where species-ability-gated content will eventually live (e.g., "only Spino can swim to this scroll")

### Personal best
- Fastest completion time per expedition length
- Highest bones collected
- "No Detect" badge per expedition (completed without any guard seeing you)

### What bones/scrolls unlock
- **New dino species to adopt** — currently 5, eventually 9+
- **Cosmetic room variants** (stone temple → moss temple → frozen temple)
- **Starting inventory items** (begin expedition with a bone + whistle)
- **Museum decor** (torches, statues, dino skeletons)

---

## E. Stealth Tools

Player starts each expedition with a small inventory. Consumable items.

### Launch toolkit (3 items)

**🦴 Distraction Bone**
- Throw it 3 tiles in the direction you're facing
- Nearby guards turn and walk to investigate, ignoring you for ~4 seconds
- 2 bones per expedition at launch; more if you've unlocked that upgrade

**📯 Whistle**
- Single-use, loud noise
- All guards in the room turn to face the player's current position
- Risky — can bait a guard to move along their patrol
- Useful on watchers (forces cone orientation)
- 1 whistle per expedition

**🌿 Herbs (auto-used)**
- When player is inside a tall grass patch, guards can't see them even at point-blank
- Not an item per se — just a map feature, but it's the primary "safe zone"

### How tools change play
- Every room has at least **one valid path** without tools (solvability guarantee)
- Tools **open alternative paths** or **speed up** solutions
- No-detect bonuses often require clever tool use

### Future tools (not launch)
- Rock / pebble: thrown at switches
- Scent cover: counters Sniffer guards
- Rope: cross a single pit without a block
- Cloak: brief invisibility (metered)

---

## Player-Facing UX

### Expedition start screen
```
  Choose your expedition

  [Quick Dip]      [Standard]      [Deep Dive]
   3 rooms          5 rooms          8 rooms
   ~3 minutes       ~6 minutes       ~10 minutes
   Best: 2:14       Best: 5:48       Best: —

  Your dino: Spino (Juvenile)
  Inventory: 🦴🦴 📯
```

### In-room HUD
- Top left: expedition progress (room X of Y)
- Top center: no-detect status (🟢 undetected / 🔴 spotted once)
- Top right: tool inventory (bones remaining, whistle remaining)
- Bottom left: bones/scrolls earned this run

### Results screen
```
  Expedition complete!
  +12 🦴 bones
  +1 📜 scroll found
  2:14 (personal best!)
  ⭐ No Detect! +5 bonus bones

  [Return to Valley]   [Try again]
```

---

## Implementation Phases

### Phase 1 — Arena + Template System (foundation)
- Replace current room generator with a template-based sequencer
- Author templates 1–3 (introductory stealth) and wire them in
- Player spawns at `S` tile, exit opens at `E` tile
- Re-use existing guard/plate/block code, just driven by template data

### Phase 2 — Expedition Structure
- Expedition length choice screen
- Room-to-room transition (brief fade, bone count + detect status carries over)
- Results screen at end of expedition
- Personal best storage (per expedition length, per profile)

### Phase 3 — Bones & Scrolls
- Bones awarded at end of each room + at expedition end
- Scrolls placed in templates as optional `spawns` entries
- Museum display cases that unlock on bone count milestones
- Scroll lore text stored per scroll ID

### Phase 4 — Stealth Tools
- Inventory bar + keyboard/touch controls for using tools
- Distraction bone: throw animation, guard investigates behavior
- Whistle: all-guards-face-player on use
- Tall grass: vision cone ignores tiles with grass tag

### Phase 5 — Content Expansion
- Templates 4–15 (remaining library)
- Second zone palette (moss / frozen / volcanic retextures)
- Boss rooms with bespoke mechanics
- Species-ability gates on bonus scrolls

### Phase 6 — Polish & Stretch
- Room transitions with narrative snippets ("you hear scratching ahead…")
- Dino companion unlocks (rescue a baby dino in a room, it follows you home)
- Daily seeded expedition (same 5 rooms for everyone, leaderboard)

---

## What Gets Thrown Away

- Current recursive-backtracking maze generator (tree) — keeps existing in-code but unused by dungeon
- BSP generator in Phase 1 of the previous plan — pivoting before we finish porting content
- Current "wander to exit" feel of the dungeon

## What Gets Kept

- Guard AI (patrol / watcher / cones)
- Keys + doors, plates + gates, push blocks (all now driven by templates)
- Noise system (running = shift) — becomes a natural tool alongside distraction bone
- Solvability verifier — still runs on template layouts in case of authoring bugs
- Walk sprites, dino rendering, particles, audio

---

## Open Questions

1. **Room size.** 9×7 tiles at TILE=50 = 450×350 pixels, fits the 800×600 canvas with room for UI. Is this cramped? Could zoom to 60px tiles.
2. **Inventory UI** — canvas-rendered (simple, consistent) or DOM overlay (richer)?
3. **Template authoring** — hand-edit TS literals or build a tiny visual editor? Latter is a lot of work.
4. **Do tools carry over between rooms?** I'd say yes — your whistle is your whistle for the whole expedition.
5. **Does getting caught cost anything?** If resets are free, there's no risk. Proposal: spotted counter. First detection = warning. Second = lose some bones. Third = expedition ends (but keep what you banked).
6. **How do bones persist?** Profile-scoped localStorage. Never lost — only spent at Museum.
7. **How does the Museum actually render display cases?** Probably beyond this doc — would expand the DinoCollection component into a walkable Museum with more room.

---

## Success Criteria

We'll know this worked if:
- A 5-year-old can describe the puzzle in each room ("the room where you push the block")
- A parent plays through a Standard expedition without boredom
- Players *want* to replay to improve their best time or find scrolls
- Adding a new room is a **data** change (new template literal), not a **code** change
- Getting caught feels fair — "that was my mistake" not "that was unwinnable"
