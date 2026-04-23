# Dino Dungeon Sprite Prompts

Prompts for generating tile-scale sprite art in Google AI (Imagen / Gemini). Each prompt is written to match the existing dungeon-assets style.

---

## Shared Style Guide

Include this preamble with each prompt so the generated sprites all feel like part of the same set.

> Children's storybook sprite art, cartoony and cute, with bold dark outlines, warm saturated colors, and soft subtle shading that reads like a painted illustration rather than pixel art or 3D. View angle is roughly 3/4 isometric, looking slightly down at the object from front-right. The object should be centered in the frame with a small amount of padding around it. **Transparent background, PNG, 512×512, no shadow plate, no ground texture, no labels or text.** Art should feel like a single self-contained game asset that could be placed on a grass tile.

(When prompting, paste the preamble followed by the specific item description.)

---

## Items & Features

### Pressure Plate — idle

> A square stone pressure plate about the size of a large book, sunk slightly into the ground. Raised green emerald-like crystal in the center with a faint glow. Ancient dino-footprint glyphs carved into each corner of the plate. Color: warm stone with mossy green tint in the crystal.

### Pressure Plate — pressed/activated

> The same stone pressure plate, but now pressed firmly into the ground, with the emerald crystal brightly lit and radiating a soft golden-green glow. Tiny sparkle particles drift upward. Plate looks slightly embedded and "locked in."

### Plate Gate — closed

> A thick stone archway or vertical slab gate, carved with dino-bone glyphs and a central round socket (matching the plate's crystal). The gate is closed: the slab completely blocks the archway, no light passes through. Color: weathered stone gray with green mossy glyphs.

### Plate Gate — open

> The same stone archway, but the gate slab has retracted into the top, leaving a clear dark opening. Small glowing green particles drift at the edges of the opening. Looks safe to walk through.

### Red Key

> An ornate iron dungeon key with a ruby-red round head set with a gem, and a simple two-notch bit. Slightly weathered metal, glints of light along the shaft. Small dino-claw motif on the head.

### Blue Key

> An ornate iron dungeon key with a sapphire-blue round head set with a gem, and a simple two-notch bit. Slightly weathered metal, glints of light along the shaft. Small dino-claw motif on the head.

### Yellow Key

> An ornate iron dungeon key with a warm amber-yellow round head set with a gem, and a simple two-notch bit. Slightly weathered metal, glints of light along the shaft. Small dino-claw motif on the head.

### Red Door — closed

> A heavy stone doorway embedded in a rock wall. The door itself is thick wood reinforced with dark iron bands and rivets, stained a warm cherry-red. A large brass keyhole in the middle, with a ruby gem set above the keyhole. Carved dino-footprint glyphs flank the doorway on the stone frame.

### Blue Door — closed

> The same stone doorway, but the wooden door is stained a deep sapphire blue with the same iron bands and rivets. A large brass keyhole in the middle with a sapphire gem set above the keyhole. Carved dino-footprint glyphs on the stone frame.

### Yellow Door — closed

> The same stone doorway, but the wooden door is stained a warm amber-yellow with the same iron bands and rivets. A large brass keyhole in the middle with a golden topaz gem set above the keyhole. Carved dino-footprint glyphs on the stone frame.

### Doors — open variant (optional)

> For each color, produce an additional sprite showing the door swung open inward: the wooden slab rotated to reveal a dark archway into cave darkness beyond, with faint green glow at the threshold. Same stone frame with glyphs.

### Pit

> A square dark hole in the ground, carved into stone and dirt, with a dangerous drop visible — inside: deep blackness fading to faint red-orange glow at the bottom (like distant lava). Jagged stone edges around the rim, a few loose pebbles scattered on the lip. Viewed from slightly above.

### Tall Grass / Hide Spot

> A lush patch of tall green prehistoric ferns and grass, roughly tile-sized, growing out of a small patch of dirt. The grass is dense enough to hide a small creature inside. Individual blades are bold and cartoony, not photoreal. A few small ferns and tiny yellow wildflowers mixed in. Bright, inviting green.

### Push Block (Wooden Crate)

> A sturdy wooden cargo crate, cubic, about the size of a small chest. Weathered pine planks with dark iron banding and rivets on the corners. A single dino-skull branded into the top of the lid. Slight lift off the ground to show it's pushable. Warm wood tones.

### Stone Pillar

> A thick round stone pillar, knee-high, with decorative carved ridges near the top and bottom. Rough stone texture with green moss creeping up the base. Small fern growing out of a crack near the base. Matching visual language to the altar asset (same weathered stone palette).

### Fossil Altar Variant — used/consumed

> Same fossil altar as the existing asset (stone pedestal with bones piled on top), but **after** activation: the bones are arranged neatly, the dino-skull glows faintly from inside with green ancient energy, and small motes of green light rise from the pile. The altar looks "completed" and sacred.

### Dinosaur Egg (multi-species)

> A single large dinosaur egg, cream-colored with brown speckles, resting in a small round nest of twigs and soft moss. Cute and round, with a subtle highlight on the upper-left to give it a painted 3D feel. (Optional variants: green egg with black spots for a raptor, pale pink egg for a spinosaurus, mottled orange for a T-rex.)

### Hatched Baby Dino (generic)

> A tiny newborn dinosaur baby standing next to broken eggshell halves. Oversized head, huge cartoon eyes, tiny arms, chubby body, wobbly legs. Friendly, adorable expression. Default color: soft green. The baby is sitting on a small mound of eggshell and hay.

### Hatched Baby Variants (per species)

> - **Baby T-Rex**: same pose, olive-green with darker stripes, tiny ineffectual arms, dopey grin
> - **Baby Triceratops**: same pose, rusty-orange with beige underbelly, three tiny proto-horns just starting to push through the frill
> - **Baby Brontosaurus**: same pose, sky-blue with cream belly, extra-long wobbly neck, sleepy eyes
> - **Baby Stegosaurus**: same pose, forest-green with tiny soft plates down the back, short spiked tail
> - **Baby Pteranodon**: same pose but standing with folded wings, peach-colored, long beak, crest just forming

### Bone Fragment (for fossil collectibles)

> A single weathered dinosaur bone fragment resting on a small patch of dirt. Options include: long femur, rib, vertebra, tooth, claw, small skull. Bones are cream-colored with soft brown weathering, cartoony painted style. Ready to be picked up.

### Pillar (Tall)

> A tall stone column, about 2–3 tiles high, carved with spiraling ancient dino glyphs and topped with a flat capital. Base wider than the top. Moss streaks on one side, small cracks. Matches the altar's weathered stone palette.

---

## Usage Tips

- **Generate at 512×512 or 1024×1024** — downscale in-game for crisp results. Never upscale; you lose the crisp linework.
- **Ask for transparent background explicitly** in every prompt. Models often add a ground patch by default.
- **Generate 3–4 of each** and pick the most consistent with the rest of the set. First attempt often has wrong perspective.
- **If the style drifts**, paste the altar sprite as a reference image and say "match this style."
- **Keep the palette consistent**: warm stone grays, mossy greens, cream bones, warm wood browns, and accent colors (red/blue/yellow) only where specified.
- **Avoid**: drop shadows baked into the sprite (we add shadows in code), text/labels on the asset, multiple items in one sprite unless asked.
