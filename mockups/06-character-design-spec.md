# Diver Character Design Specification

## Design Philosophy
**Cute chibi figure** — big head, small body, oversized detailed gear. Like a premium vinyl toy / Pop Mart figurine that happens to be a scuba diver. Adorable but with accurate, recognizable dive equipment.

### Primary Style References
1. **Chibi Astronaut** (pinterest.com/pin/15762667440935908/) — Head:Body 1:1.5, oversized helmet/backpack, earth tone palette, high detail gear with buttons/gauges
2. **Cute Sci-Fi Girl** (pinterest.com/pin/7177680651652118/) — Big expressive eyes, soft pastel+yellow suit, chunky boots, matte+metallic texture mix
3. **Scuba Diver by Nizam Majumder** (pinterest.com/pin/632896553884751935/) — Swimming pose reference, accurate dive gear layout

### Style DNA
- Proportions: Head:Body ~1:1.5 (chibi figure)
- Big eyes visible through oversized dive mask
- Equipment larger than realistic — makes gear educational and clickable
- Soft matte body + metallic/glossy equipment accents
- Pastel ocean palette (teal, coral, soft navy) with bright accent details
- Vinyl toy / figurine quality — like a collectible you want to own

---

## Character Style

### Body Proportions
- **Head-to-body ratio:** 1:1.5 (chibi figure — head is 40% of total height)
- **Build:** Round, chunky, compact — like a vinyl toy
- **Height:** ~1.2m in-world scale (chibi scale, not real human)
- **Poly count:** 5,000–8,000 triangles (LOD0)
- **Art style:** Smooth high-quality shading, rounded everything, NO sharp edges
- **Surface:** Matte skin/wetsuit + glossy metallic equipment (dual material feel)

### Face
- Large expressive eyes (visible through mask)
- Simple dot nose
- Minimal mouth — expressions through eyes + body language
- Mask creates frame for face — key visual identity element

### Body Colors
| Part | Color |
|------|-------|
| Wetsuit body | Deep navy (#1a2744) with cyan (#00e5ff) accent stripes |
| Wetsuit trim | Cyan highlights at shoulders, wrists, ankles |
| Skin (visible: hands, neck) | Warm neutral — multiple skin tone options |
| Hair | Visible above mask strap — 6 color options |
| Fins | Teal/cyan gradient |
| Mask strap | Black |
| Mask lens | Light blue with slight transparency |

---

## Equipment (Separate Meshes)

Each equipment piece is a separate mesh parented to the armature bone structure. This allows:
- Highlighting individual items during BWRAF check
- Swapping equipment configurations
- Click-to-inspect interaction

### Equipment List

| Equipment | Parent Bone | Mesh Name | Notes |
|-----------|------------|-----------|-------|
| **Mask** | head | `mask` | Glass material (MeshPhysicalMaterial, transmission: 0.3) |
| **Regulator** | head | `regulator_primary` | Mouthpiece + hose to first stage |
| **Octopus/Alt air** | spine_upper | `regulator_alt` | Yellow color, clipped to chest triangle |
| **BCD / Jacket** | spine | `bcd` | Visible inflate/deflate bladder areas |
| **Tank (single)** | spine | `tank_single` | Cylinder + valve + first stage |
| **Tank (doubles)** | spine | `tank_doubles` | Alternative config |
| **Weight belt** | hips | `weight_belt` | Right-hand release buckle visible |
| **Weight pockets** | hips | `weight_pockets` | Integrated BCD weight system |
| **SPG / Console** | hand_L | `console` | Pressure gauge + compass |
| **Dive computer** | wrist_L | `dive_computer` | Wrist-mounted — shows selected brand |
| **Fins (L)** | foot_L | `fin_left` | Split fin design |
| **Fins (R)** | foot_R | `fin_right` | Split fin design |
| **Gloves** | hand_L, hand_R | `glove_l`, `glove_r` | Thin neoprene style |
| **Hood** | head | `hood` | Optional, for cold water scenarios |
| **Torch/Light** | hand_R | `torch` | Optional, for wreck penetration |
| **SMB** | bcd_dring | `smb` | Surface marker buoy, clipped |
| **Reel** | bcd_dring | `reel` | For SMB deployment |

### Equipment Highlight System (BWRAF)
During pre-dive check:
- Active check item → **cyan glow outline** (emissive shader)
- Completed items → **green tint**
- Pending items → **default (no highlight)**
- Wrong click → **red flash** + shake animation

---

## Armature / Rig

### Bone Structure
```
root
├── hips
│   ├── spine
│   │   ├── spine_upper
│   │   │   ├── neck
│   │   │   │   └── head
│   │   │   ├── shoulder_L
│   │   │   │   ├── arm_upper_L
│   │   │   │   │   ├── arm_lower_L
│   │   │   │   │   │   └── hand_L
│   │   │   │   │   │       └── wrist_L (dive computer)
│   │   │   └── shoulder_R
│   │   │       ├── arm_upper_R
│   │   │       │   ├── arm_lower_R
│   │   │       │   │   └── hand_R
│   ├── leg_upper_L
│   │   ├── leg_lower_L
│   │   │   └── foot_L (fin_L)
│   └── leg_upper_R
│       ├── leg_lower_R
│       │   └── foot_R (fin_R)
```

### IK Targets (for procedural animation)
- `ik_foot_L` / `ik_foot_R` — fin kick drive
- `ik_hand_L` / `ik_hand_R` — hand signal poses
- `look_at` — head tracking target

---

## Animations

### Core Animations (Blender Action Editor)

| Animation | Name | Loop | Duration | Description |
|-----------|------|------|----------|-------------|
| **Idle Hover** | `idle` | Loop | 3s | Gentle body sway, slight fin movement, breathing rhythm |
| **Swim Forward** | `swim_forward` | Loop | 1.5s | Full flutter kick, arms at sides, slight body undulation |
| **Swim Slow** | `swim_slow` | Loop | 2.5s | Relaxed frog kick, hands clasped at front |
| **Descent** | `descend` | Loop | 2s | Head down 15°, controlled fin kicks, one hand on nose (equalize) |
| **Ascent** | `ascend` | Loop | 2s | Head up 10°, slow fin kicks, one hand on inflator hose |
| **Safety Stop** | `hover_stop` | Loop | 4s | Perfect trim, minimal movement, looking at computer |

### Hand Signals (One-shot)

| Signal | Name | Loop | Duration | Description |
|--------|------|------|----------|-------------|
| OK | `signal_ok` | Once | 1.5s | Thumb + index circle, other fingers extended |
| Thumb Up | `signal_up` | Once | 1s | Fist + thumb up — "ascend" |
| Thumb Down | `signal_down` | Once | 1s | Fist + thumb down — "descend" |
| Problem | `signal_problem` | Once | 2s | Flat hand, side-to-side wave |
| Out of Air | `signal_no_air` | Once | 1.5s | Flat hand across throat |
| Stop | `signal_stop` | Once | 1s | Open palm facing forward |
| Low on Air | `signal_low_air` | Once | 2s | Fist tap on palm |
| Equalize | `equalize` | Once | 1s | Pinch nose through mask |

### Equipment Interaction (One-shot)

| Action | Name | Duration | Description |
|--------|------|----------|-------------|
| Check BCD | `check_bcd` | 2s | Hand reaches to inflator, press inflate, press deflate |
| Check Weights | `check_weights` | 2s | Hand to weight belt buckle, tug test |
| Check Air | `check_air` | 2s | Look at SPG console, tap gauge |
| Deploy SMB | `deploy_smb` | 3s | Unclip SMB, inflate, release |

### Bubble Emission
- **Source:** `regulator_primary` mesh → mouthpiece bone position
- **Pattern:** Burst every 3–4 seconds (exhale cycle)
- **Bubble count:** 8–15 per burst
- **Wobble:** Sinusoidal X offset as bubbles rise
- **Size variation:** 2–8px random per bubble
- **Opacity:** Starts 0.6, fades to 0 as bubble rises
- **Rise speed:** 0.3–0.5 m/s with slight variation

---

## Character Customization (Future)

### Player Options
| Option | Choices |
|--------|---------|
| Skin tone | 6 presets (light → dark) |
| Hair color | Black, Brown, Blonde, Red, Blue, Purple |
| Hair style | Short, Medium, Ponytail (fits under hood) |
| Wetsuit color | Navy, Black, Red, Teal |
| Fin color | Cyan, Yellow, Black, Pink |
| Gender | Neutral body shape, no binary lock |

### Certification Badge
- Small embroidered patch on BCD shoulder
- Shows current certification level: OW / AOW / Rescue / DM / Instructor
- Unlocked through game progression

---

## Technical Implementation Notes

### Blender Workflow
1. Model in Blender 4.x with subdivision surface modifier (render only)
2. Export base mesh WITHOUT subdivision (keeps poly count low)
3. Armature: Blender's native armature system
4. Animations: Blender Action Editor → NLA tracks → export as separate clips
5. Export format: `.glb` binary GLTF with Draco compression
6. Texture: Single atlas 1024x1024 for character + all equipment

### Three.js Loading
```typescript
const { scene, animations } = useGLTF('/models/diver.glb');
const mixer = new AnimationMixer(scene);
const actions = {
  idle: mixer.clipAction(animations.find(c => c.name === 'idle')),
  swim: mixer.clipAction(animations.find(c => c.name === 'swim_forward')),
  // ...
};
```

### Material Strategy
- **Body/Wetsuit:** `MeshToonMaterial` — cel-shaded look, 3 gradient steps
- **Mask glass:** `MeshPhysicalMaterial` — transmission: 0.3, roughness: 0.05
- **Metal (tank, buckles):** `MeshStandardMaterial` — metalness: 0.8, roughness: 0.3
- **Rubber (fins, hoses):** `MeshStandardMaterial` — metalness: 0, roughness: 0.7

---

## Reference Art Direction

### Style References (for artist)
- **Primary:** Chibi astronaut pins (pinterest.com/pin/15762667440935908/, pinterest.com/pin/7177680651652118/)
- **Pose reference:** "Scuba Diver" by Nizam Majumder (pinterest.com/pin/632896553884751935/)
- **Proportions:** Chibi 1:1.5, similar to Pop Mart Molly / Funko but higher quality
- **Equipment:** Oversized but accurate — mask, BCD, tank, regulator, fins all recognizable for teaching
- **Color mood:** Ocean pastels (teal, coral, soft navy) + metallic silver/brass gear accents
- **Emotional tone:** Adorable, curious, brave little explorer — NOT a toy, a tiny adventurer
- **Silhouette test:** Big helmet/mask head + tank backpack = instant scuba diver recognition
- **Surface quality:** Premium figure feel — soft matte body, glossy mask lens, brushed metal on gear
- **Face:** Big sparkly eyes behind oversized dive mask, tiny nose, slight smile
