# Dino Desk – Dungeon Crawler Expansion

Planning doc for expanding the dungeon crawler (currently Volcano Escape's Hard mode) into a richer experience aimed at **6–10 year olds**.

---

## Current State
- Level-based layout, similar to Volcano Escape
- Collect keys to unlock exit doors
- Occasional dino guards with visible detection zones
- Getting spotted sends you back to level start

---

## Design Target
**Age:** 6–10
**Design principles:** complexity is welcome, challenge is desired, systems should reward mastery, content should invite replay.

---

## Tier 1: Core Loop Additions (small scope, high impact)

These deepen the existing mechanics without major rework.

### Key & Lock Variety
- [ ] Colored keys for colored doors
- [ ] Rare skeleton keys (any door, limited supply)
- [ ] Master key as boss/end-of-zone reward

### Environmental Interaction
- [ ] Pressure plates (stand on to open doors)
- [ ] Weighted plates (require boulder, guard, or companion)
- [ ] Switches (hit from a distance)
- [ ] Push/pull blocks (Sokoban-style)

### Limited-Use Items
- [ ] Torches (light dark rooms, burn out over time)
- [ ] Rope (cross one gap)
- [ ] Whistle (distract a guard once)
- [ ] Throwable rocks/bones (hit switches, distract guards)

### Noise System
- [ ] Running = loud, walking = silent
- [ ] Creaky floor tiles
- [ ] Breakable pots (distract or alert)

---

## Tier 2: Guard & Stealth Depth

### Guard Types
- [ ] **Patrol** (current) — fixed route, visible cone
- [ ] **Sleeper** — snoring, wakes if approached or on noise
- [ ] **Chaser** — fast but dumb, loses you around corners
- [ ] **Watcher** — stationary, rotating cone, longer sight
- [ ] **Sniffer** — follows scent trail for a few seconds

### Stealth Tools
- [ ] Hiding spots (barrels, tall grass, behind pillars)
- [ ] Hold-still mechanic while hidden
- [ ] Scent-masking item (counters Sniffers)

---

## Tier 3: Progression Systems (the real engagement driver)

### Hub World
- [ ] A base camp / dino village between dungeon runs
- [ ] NPCs who give hints, lore, side quests
- [ ] Upgrade vendor (spend collected bones/relics)
- [ ] Could connect to Dino Valley as a "ruins" overlay for older kids

### Unlockable Abilities (metroidvania-lite)
- [ ] Dash — cross gaps, escape guards
- [ ] Wall hug / peek — corner without being seen
- [ ] Throw — rocks, bones, distractions
- [ ] Climb or double-jump
- [ ] Tame a small dino companion (fits through small gaps)

Each ability should retroactively open new paths in old levels.

### Collectibles With Purpose
- [ ] Dino bones → currency for upgrades
- [ ] Ancient scrolls → unlock Museum entries (connects to existing feature!)
- [ ] Hidden eggs → hatch into companions at the hub
- [ ] Cave paintings → reveal story fragments

---

## Tier 4: Content Expansion

### Themed Zones
- [ ] Stone temple ruins (current vibe)
- [ ] Overgrown jungle temple (vines, swinging)
- [ ] Ice caves (slippery floors, frozen keys melt with torches)
- [ ] Flooded dungeon (limited air, altered movement)
- [ ] Lava tubes (timing-based, ties to Volcano Escape)
- [ ] **Obsidian Fortress** — final mega-dungeon

### Environmental Hazards
- [ ] Spike traps
- [ ] Crumbling floors
- [ ] Arrow traps
- [ ] Rolling boulders
- [ ] Timed platforms

### Secrets & Discovery
- [ ] Fake walls
- [ ] Pushable statues revealing rooms
- [ ] Gradually-revealing map
- [ ] Optional "hard path" routes through levels

---

## Tier 5: Boss Encounters

Puzzle/stealth bosses — not combat.

- [ ] **Sleeping T-Rex** — sneak across its back to reach a relic
- [ ] **Raptor Pack** — patrol in formation, time movement between sweeps
- [ ] **Spino in flooded arena** — lure onto pressure plates
- [ ] **Elder Pterodactyl** — avoid shadow passes from above
- [ ] Zone finale bosses gate progression to next zone

---

## Tier 6: Replay & Social

- [ ] Per-level speedrun timer and best-time tracking
- [ ] Completion stats (keys found, secrets, no-detection runs)
- [ ] Daily seeded dungeon (same for everyone, leaderboard)
- [ ] Level editor (premium or late-game unlock)
- [ ] Share codes for user-created levels

---

## Tier 7: Story & World

- [ ] Light narrative: exploring ruins of the Great Dino Civilization
- [ ] Story fragments revealed per dungeon (paintings, tablets, ghost elder)
- [ ] Recurring rival character (dino thief who shows up in cutscenes)
- [ ] Named guards in later levels with personality
- [ ] A satisfying finale that ties lore together

---

## Stretch: Co-op Mode

Two kids, shared puzzles.

- [ ] Local co-op (split keyboard or two gamepads)
- [ ] Big dino (pushes boulders, breaks walls)
- [ ] Small dino (fits through cracks, sneaks past guards)
- [ ] Puzzles requiring both players
- [ ] High replay value for siblings / playdates

---

## Suggested Build Order

### Phase 1 — Deepen the Core (1–2 weeks of work each)
1. Colored keys + doors
2. Pressure plates + push blocks
3. One additional guard type (Watcher recommended — easiest to build)
4. Noise system (running vs. walking)

### Phase 2 — First Zone Complete
5. Build out stone temple as a full zone (8–12 levels)
6. Add first puzzle boss
7. Basic hub world (even just a single screen)

### Phase 3 — Progression Hook
8. Bones as currency, one upgrade vendor
9. First unlockable ability (Dash is the most versatile)
10. Speedrun timers

### Phase 4 — Content & Retention
11. Second zone (ice caves or jungle)
12. Scroll collectibles → Museum tie-in
13. Story fragments and one NPC at the hub

### Phase 5 — Ambition
14. Remaining zones
15. Daily seeded dungeon
16. Level editor or co-op (pick one)

---

## Open Questions

- Does the dungeon crawler share the Baby Dino avatar with the younger-kid modes, or is it its own character? (Could be a grown-up version of their dino.)
- How does this sit alongside Dino Valley? Is the hub a separate screen, or is the Valley itself the hub with a "ruins" entrance?
- Is there combat at all, or is it fully stealth/puzzle? (Recommendation: no combat. Stealth + puzzle is cleaner design and keeps the tonal consistency with the rest of the app.)
- Monetization: is the dungeon crawler the "premium" tier of the app, or included?
