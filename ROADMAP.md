# Dino Desk – Roadmap

Planning doc for three connected features: **Dino Valley**, **Baby Dino Avatar**, and **Daily Adventure**.

---

## Vision

Transform Dino Desk from a menu of six games into a living prehistoric world the child inhabits through their own baby dinosaur. Together, the three features form a loop:

> Play games → earn stickers → grow your dino + unlock valley decorations → daily adventure brings you back tomorrow.

---

## Feature 1: Dino Valley (replaces current menu + Dino Path)

A top-down or side-scrolling map showing the prehistoric valley. Each game lives at a location. The child's baby dino avatar walks between them using the current tap-to-move mechanic from Dino Path.

### Locations
- **Volcano** → Volcano Escape
- **Nest** → Egg Hunt
- **Jungle** → Jungle Explorer
- **Fossil Cave** → Dino Match
- **Chalkboard Tree** (or similar) → Spell Dino
- **Museum Building** → Dino Museum (enter to view collection)
- **Quest Giver** (elder dino NPC) → Daily Adventure

### Design Decisions
- **Movement:** tap-to-move (reuses Path game muscle memory, toddler-friendly)
- **Unlocks:** all locations available from day 1; decorations/ambient life appear as progress is made
- **Ambient polish:** background dinos wandering, butterflies, waterfall, day/night cycle (optional)

### Implementation Notes
- Canvas-based like existing games — reuse rendering pipeline
- Valley is the new root screen; current menu becomes settings/parent dashboard only
- Dino Path mechanics move into valley navigation (no longer a standalone game)

---

## Feature 2: Baby Dino Avatar

The child's personal dinosaur. Created on first launch, grows over time, appears as their sprite throughout the valley.

### Creation Flow (first launch)
1. "Let's meet your dino!"
2. Pick species (3–5 options: T-Rex, Stego, Tri, Bronto, Raptor)
3. Pick color (palette of 6–8)
4. Pick pattern (stripes, spots, solid) — optional
5. Name it (parent can type, or pick from suggested names)

### Growth Stages
Tied to **unique stickers earned**, not play time (avoid incentivizing long sessions).

| Stage | Name | Unlocks At |
|-------|------|-----------|
| 1 | Egg | Start |
| 2 | Hatchling | 1 sticker |
| 3 | Baby | 5 stickers |
| 4 | Kid | 15 stickers |
| 5 | Junior | 30 stickers |
| 6 | Grown | 50 stickers |

### Accessories
Unlockable cosmetics: leaf hat, sunglasses, backpack, face paint, flower crown, scarf, etc. Earned through gameplay and Daily Adventures.

### "My Dino" Screen
- View current dino
- Swap accessories
- Growth history ("You hatched on [date], reached Kid stage on [date]")
- Option to rename

---

## Feature 3: Daily Adventure

A once-per-day themed mini-quest that strings together 2–3 games with a narrative wrapper.

### Flow
1. Tap the Quest Giver NPC in the valley
2. Short intro: *"Stego lost her eggs! Can you help?"*
3. Complete 2–3 connected games
4. Celebration screen + exclusive reward (accessory or special sticker)

### Design Rules
- Max 3 games per adventure; 2 is the sweet spot
- Resets at local midnight
- **No streaks** — missing days has no penalty
- Rewards are cosmetic only, never gate progression
- Library of 20–30 hand-written narratives, rotated randomly

### Example Adventures
- *The Lost Eggs:* Jungle Explorer → Egg Hunt
- *Volcano Rescue:* Volcano Escape → Dino Match (find the rescued dino's friends)
- *Name the New Dino:* Egg Hunt → Spell Dino
- *Museum Night:* Dino Match → Jungle Explorer (museum dinos escaped!)

---

## The Interconnection

```
         ┌─────────────────┐
         │   Play Games    │
         └────────┬────────┘
                  │ earns stickers
                  ▼
         ┌─────────────────┐
         │ Grow Baby Dino  │
         │  + Unlock Decor │
         └────────┬────────┘
                  │ appears in
                  ▼
         ┌─────────────────┐
         │   Dino Valley   │◄──── Daily Adventure
         └────────┬────────┘      (pulls child back)
                  │ navigate to
                  ▼
             [next game]
```

---

## Phased Build Plan

### Phase 1: Foundations (build first)
- [ ] Refactor menu into Valley screen (static map, no animation yet)
- [ ] Move tap-to-move logic out of Dino Path into Valley navigation
- [ ] Replace Dino Path with valley traversal
- [ ] Place game entry points at each location
- [ ] Dino creation flow on first launch (species + color only to start)
- [ ] Save avatar to local storage

### Phase 2: Make It Feel Alive
- [ ] Baby Dino walks the valley as the player sprite
- [ ] Growth stages tied to sticker count
- [ ] "My Dino" viewing screen
- [ ] Ambient valley life (background dinos, butterflies)

### Phase 3: Daily Adventure
- [ ] Quest Giver NPC in valley
- [ ] Adventure framework (chain N games with narrative wrapper)
- [ ] Library of 10 starter narratives
- [ ] Daily reset logic
- [ ] Exclusive accessory rewards

### Phase 4: Depth
- [ ] Accessory system + unlock pipeline
- [ ] Expanded narrative library (20–30 adventures)
- [ ] Valley decorations that unlock with progress
- [ ] Growth history / milestone dates on My Dino screen
- [ ] Day/night cycle in valley (optional)

---

## Open Questions
- How does the 3-tier difficulty system (see IDEAS.md) interact with Daily Adventure? Does the adventure use the child's current difficulty setting, or its own fixed level?
- Does the Parent Dashboard show growth stage progression as a parent-facing milestone?
- Should siblings be able to have separate dino avatars on the same device? (Profile system.)
- Do accessories stack visually (hat + glasses + backpack at once) or is it one-at-a-time?
