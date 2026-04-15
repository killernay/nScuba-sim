# nScuba-sim — Product Requirements Document

**Version:** 1.0
**Date:** 2026-04-15
**Author:** nScuba Team

---

## 1. Product Overview

### 1.1 Vision
Web-based scuba dive simulator set at the MV Hardeep wreck (Chumphon, Thailand) for teaching recreational and technical diving theory through interactive 3D simulation.

### 1.2 Problem Statement
Dive students learn gas planning, NDL, decompression theory, and emergency procedures from textbooks and classroom sessions. These concepts are abstract and hard to internalize without real-world experience. A simulator bridges the gap — students can see how depth affects gas consumption, NDL, and PPO2 in real-time before entering the water.

### 1.3 Target Users

| User | Need |
|------|------|
| **Dive students** (OW/AOW) | Practice gas planning, BWRAF checks, understand NDL/depth relationship |
| **Dive instructors** | Classroom teaching tool, demonstrate scenarios live |
| **Nitrox/Tech students** | Understand MOD, PPO2, trimix, decompression planning |
| **Dive shops / centers** | Marketing tool, embed on website, brand dive computers |
| **Dive computer brands** | Product showcase — students learn on their UI before buying |

### 1.4 Key Differentiators vs Existing (Zenobia App on Play Store as reference)
- **Skinnable dive computer HUD** — real brand layouts (Shearwater, Garmin, Suunto)
- **Cute stylized diver character** — not first-person only
- **BWRAF interactive pre-dive check** — gamified education
- **i18n multi-language** — global reach
- **Web-based** — no install, works on desktop/tablet
- **Post-dive profile analysis** — depth graph with violation markers
- **No ads** — clean educational experience

---

## 2. i18n — Internationalization Strategy

### 2.1 Priority Languages

| Tier | Languages | Rationale |
|------|-----------|-----------|
| **Tier 1 (Launch)** | English, Thai (ไทย) | Primary market + developer locale |
| **Tier 2 (3 months)** | Japanese (日本語), Korean (한국어), Chinese Simplified (简体中文) | Large Asian dive markets |
| **Tier 3 (6 months)** | German (Deutsch), French (Français), Spanish (Español), Russian (Русский) | European dive community, Red Sea/Mediterranean dive tourism |
| **Tier 4 (Future)** | Arabic, Bahasa Indonesia, Portuguese | Emerging dive markets (Egypt, Bali, Brazil) |

### 2.2 Implementation

- **Library:** `react-i18next` + `i18next`
- **Namespace strategy:** Separate JSON files per feature area:
  ```
  locales/
    en/
      common.json      — shared UI (buttons, labels, nav)
      dive.json         — dive-specific terms (depth, NDL, ascent rate)
      gas.json          — gas planning terms (nitrox, trimix, MOD, PPO2)
      bwraf.json        — pre-dive check procedure text
      computer.json     — dive computer display labels
      tutorial.json     — educational explanations
    th/
      common.json
      dive.json
      ...
  ```
- **Key naming convention:** `namespace:key` e.g. `dive:currentDepth`, `gas:selectBackGas`
- **Fallback:** English
- **RTL support:** Deferred to Tier 4 (Arabic)

### 2.3 i18n Rules
- All user-facing strings in translation files — zero hardcoded text
- Numbers/units: locale-aware formatting (`Intl.NumberFormat`)
- Dive-specific units remain metric (meters, bar) as international standard — imperial toggle as option
- Dive computer brand skins use original English labels (brand accuracy)
- Scientific terms (PPO2, NDL, CNS, MOD) stay in English globally — universally recognized

### 2.4 Unit System Toggle
| Setting | Metric (default) | Imperial |
|---------|-------------------|----------|
| Depth | meters (m) | feet (ft) |
| Pressure | bar | PSI |
| Temperature | °C | °F |
| Volume | liters (L) | cubic feet (cuft) |

---

## 3. Feature Specifications

### Phase 1 — Core Simulator Engine

#### 3.1 Dive Physics Engine
Pure TypeScript module — no React dependency, fully testable.

**3.1.1 Ambient Pressure**
```
P_amb (bar) = 1.0 + (depth_m / 10.0)
```

**3.1.2 Gas Consumption**
```
pressure_drop_per_tick (bar) = (RMV × P_amb × dt_minutes) / cylinder_volume_L
```
- RMV affected by: base SAC rate × stress multiplier × exertion multiplier
- Stress multiplier: 1.0 (calm) → 2.5 (panic)
- Exertion multiplier: 1.0 (hovering) → 1.8 (swimming hard)

**3.1.3 NDL — Bühlmann ZHL-16C Algorithm**
- 16 tissue compartments with half-times 5.0 to 635.0 minutes
- Haldane equation for tissue loading at constant depth
- Schreiner equation for ascent/descent segments
- Ceiling calculation: `P_ceiling = max((P_tissue_i - a_i) × b_i)` across all 16 compartments
- Gradient Factor support (GF Low/High) for conservative planning
- NDL = time until any compartment ceiling reaches surface pressure

**3.1.4 Partial Pressure Tracking**
- PPO2 = FO2 × P_amb
- PPN2 = FN2 × P_amb (for narcosis)
- MOD = ((PPO2_limit / FO2) - 1) × 10
- CNS O2 toxicity: accumulation based on PPO2 exposure time (NOAA table)

**3.1.5 Buoyancy Model**
- Wetsuit compression: `V_at_depth = V_surface / P_amb`
- BCD volume follows Boyle's Law on ascent/descent
- Net buoyancy = (displaced_volume × water_density × g) - (total_mass × g)

**3.1.6 Narcosis Model**
- narcosis_factor = clamp((PPN2 - 2.4) / 3.1, 0, 1)
- Applied as: screen distortion, compass wobble, reaction delay

**3.1.7 Ascent Rate Monitor**
- Safe: 0–9 m/min (green)
- Caution: 9–18 m/min (yellow)
- Danger: >18 m/min (red + alarm)

#### 3.2 Pre-Dive Setup Flow

**Screen 1 — Tank Selection**
- Options: 10L, 12L, 15L, 18L (single) / 2×10L, 2×12L (doubles)
- Visual: 3D tank models on carousel (like reference app)
- Starting pressure: slider 100–300 bar (default 200)

**Screen 2 — Gas Mix Selection**
- Back gas: Air (21%), EANx22–40% (slider), or Trimix presets
- Auto-calculated MOD display (updates live)
- Deco gas (optional): EAN50, EAN80, O2
- Gas analyzer animation (verify mix)

**Screen 3 — Diver Profile**
- SAC rate: slider 8–30 L/min (default 15)
- Experience level preset: Beginner(22) / Intermediate(15) / Advanced(12) / Tech(9)
- Gradient factors: GF Low / GF High (advanced toggle)

**Screen 4 — Dive Computer Selection**
- Choose HUD skin (see 3.3)
- Preview of selected computer layout

#### 3.3 Dive Computer HUD — Skin System

**Architecture:** Each skin is a self-contained React component implementing `DiveComputerSkin` interface.

```typescript
interface DiveComputerSkin {
  id: string;
  name: string;
  brand: string;
  component: React.FC<DiveComputerProps>;
  thumbnail: string;        // preview image
  colorScheme: ColorScheme;
}

interface DiveComputerProps {
  depth: number;
  maxDepth: number;
  diveTime: number;
  ndl: number;
  tankPressure: number;
  gasMix: GasMix;
  ppo2: number;
  ascentRate: number;
  temperature: number;
  safetyStop: SafetyStopState | null;
  decoStops: DecoStop[];
  cns: number;
  warnings: Warning[];
}
```

**Included Skins:**

| Skin | Layout Style | Key Visual |
|------|-------------|------------|
| **Default** | Clean modern | Cyan/teal, minimal, educational labels |
| **Shearwater Style** | 4-corner layout | Green text on black, big depth/NDL, customizable fields |
| **Garmin Style** | Circular gauge | Color screen look, ring gauges, compass integration |
| **Suunto Style** | Dot-matrix feel | Bold numbers, minimal chrome, strip chart |

Each skin receives identical `DiveComputerProps` — only presentation differs.

**Adding new skins:** Drop a new component in `src/skins/`, register in skin registry. No core code changes needed.

#### 3.4 Core Dive HUD Data Elements

| Element | Always Visible | Warning Threshold |
|---------|---------------|-------------------|
| Current Depth (m) | Yes | — |
| Max Depth | Yes | — |
| Dive Time (mm:ss) | Yes | — |
| NDL (min) | Yes | Yellow <10 min, Red <5 min, Flash at 0 |
| Tank Pressure (bar) | Yes | Yellow <100, Red <70, Flash <50 |
| Gas Mix label | Yes | — |
| PPO2 | Yes (Nitrox/Trimix) | Yellow >1.2, Red >1.4, Flash >1.6 |
| Ascent Rate | Yes | Yellow >9 m/min, Red >18 m/min |
| CNS % | Yes | Yellow >75%, Red >100% |
| Temperature | Yes | — |
| Safety Stop timer | When ascending through 6m | Resets if diver drifts above 4m |
| Deco obligation | When NDL = 0 | Red background, shows stop depth + time |

### Phase 2 — 3D Underwater World

#### 3.5 Underwater Rendering

| Effect | Implementation |
|--------|---------------|
| Depth-dependent fog | Custom `FogExp2` override, density = f(depth) |
| Color absorption | Post-process shader (Beer-Lambert per RGB channel) |
| Caustics | Animated texture overlay on surfaces near water surface |
| Bubbles | `THREE.Points` + custom ShaderMaterial, emit from regulator |
| Water surface (from below) | Flipped PlaneGeometry with refraction shader |
| Vignette | Post-process — simulate dive mask edge |
| Chromatic aberration | Subtle, simulate water refraction |

#### 3.6 Zenobia Wreck

**Simplified model for MVP** — accurate depths, approximate geometry:

| Area | Depth Range | Priority |
|------|-------------|----------|
| Hull exterior (starboard up) | 16–35 m | P1 |
| Upper car deck (swim-through) | 18–22 m | P1 |
| Bridge / wheelhouse | ~27 m | P2 |
| Propellers (2) | 23–38 m | P2 |
| Lower cargo deck | 32–42 m | P3 (tech dive) |
| Seabed | 42–43 m | P1 |

Ship dimensions: 172m × 28m, lying on port side at 90°.

#### 3.7 Diver Character

- **Style:** Cute/stylized (rounded proportions, ~3000–5000 tris)
- **Equipment meshes:** BCD, tank, regulator, mask, fins (separate, parented to bones)
- **Animations:**
  - `idle` — neutral hover, slight sway
  - `swim_forward` — full body flutter kick
  - `fin_kick` — legs only (additive layer)
  - `signal_ok` — hand signal
  - `signal_up` — thumb up
  - `signal_problem` — hand wave
  - `equalize` — pinch nose
- **Camera:** Third-person, adjustable distance/angle
- **Bubble emission:** Particle system attached to regulator mesh, emits on "exhale" cycle

### Phase 3 — Educational Flow

#### 3.8 BWRAF Interactive Pre-Dive Check

Gamified click-through sequence. Each step:
1. Highlight target equipment on 3D diver model
2. Player clicks/taps correct item
3. Animation plays (inflate BCD, check gauge, etc.)
4. Checkmark + next step
5. Wrong click = explanation popup + retry

Scoring: Correct sequence = proceed to dive. Mistakes tracked for post-session review.

#### 3.9 Water Entry

- Select entry method based on scenario (boat type shown)
- Giant stride animation from boat deck
- Back roll animation from RIB
- BCD inflated at surface → signal OK → begin descent

#### 3.10 Descent & Equalization

- Auto-descent at controlled rate
- Equalization prompt every 1–2m (ear icon pulses)
- Player must click/press to equalize
- Miss equalization = ear pain indicator, forced stop
- Fail 3 times = dive abort with explanation

#### 3.11 Post-Dive Analysis

- **Depth profile graph** — time (X) vs depth (Y, inverted)
- NDL remaining overlay
- Violation markers (red dots): MOD exceeded, fast ascent, missed safety stop
- Gas consumption curve
- Tissue saturation bar chart (16 compartments)
- Grade: A/B/C/F based on safety compliance
- Instructor text feedback (2–3 observations)
- Dive log entry auto-generated

### Phase 4 — Advanced (Future)

#### 3.12 Advanced Features Roadmap

| Feature | Description |
|---------|-------------|
| Repetitive dives | Surface interval timer, residual nitrogen tracking |
| Emergency scenarios | Out of air, CESA, buddy share ascent |
| Dive planning calculator | Standalone tool — input depth/time/gas, get plan |
| Marine life encyclopedia | Tap fish to identify, info card with photo |
| Multiplayer buddy system | WebSocket, buddy pair diving together |
| Dive log export | PDF/CSV dive log generation |
| Mobile app | PWA or React Native wrapper |
| VR mode | WebXR support for VR headsets |
| Dive site expansion | Other wreck sites beyond Zenobia |

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 5 |
| Framework | React 18 + TypeScript |
| 3D Engine | Three.js via React Three Fiber (`@react-three/fiber`) |
| 3D Helpers | `@react-three/drei` |
| State | Zustand |
| i18n | react-i18next + i18next |
| Styling | Tailwind CSS 4 |
| Post-processing | `postprocessing` (pmndrs) |
| Collision | `three-mesh-bvh` |
| 3D Models | GLTF/GLB + Draco compression |
| Textures | KTX2 / Basis Universal |
| Testing | Vitest (unit), Playwright (e2e) |
| Linting | ESLint + Prettier |

### 4.2 Project Structure

```
nScuba-sim/
├── public/
│   ├── models/          — GLB/GLTF 3D models
│   ├── textures/        — KTX2 textures, caustics
│   └── draco/           — Draco decoder files
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── engine/          — Pure TS dive physics (no React)
│   │   ├── buhlmann.ts       — ZHL-16C tissue model
│   │   ├── gas.ts            — Gas mix calculations (PPO2, MOD, EAD)
│   │   ├── consumption.ts    — SAC/RMV gas consumption
│   │   ├── buoyancy.ts       — Buoyancy physics
│   │   ├── narcosis.ts       — Narcosis model
│   │   ├── cns.ts            — CNS O2 toxicity
│   │   ├── units.ts          — Metric/imperial conversion
│   │   └── types.ts          — Shared physics types
│   ├── stores/
│   │   ├── diveStore.ts      — Main dive simulation state
│   │   ├── setupStore.ts     — Pre-dive configuration
│   │   ├── settingsStore.ts  — App settings (language, units, skin)
│   │   └── profileStore.ts   — Dive log / history
│   ├── skins/           — Dive computer HUD skins
│   │   ├── registry.ts       — Skin registration
│   │   ├── types.ts          — DiveComputerSkin interface
│   │   ├── default/
│   │   │   └── DefaultSkin.tsx
│   │   ├── shearwater/
│   │   │   └── ShearwaterSkin.tsx
│   │   ├── garmin/
│   │   │   └── GarminSkin.tsx
│   │   └── suunto/
│   │       └── SuuntoSkin.tsx
│   ├── components/      — React UI components
│   │   ├── layout/
│   │   │   ├── MainMenu.tsx
│   │   │   └── AppShell.tsx
│   │   ├── setup/
│   │   │   ├── TankSelector.tsx
│   │   │   ├── GasMixSelector.tsx
│   │   │   ├── DiverProfile.tsx
│   │   │   └── ComputerSelector.tsx
│   │   ├── hud/
│   │   │   ├── DiveComputer.tsx     — Renders active skin
│   │   │   ├── WarningBanner.tsx
│   │   │   └── SafetyStopTimer.tsx
│   │   ├── bwraf/
│   │   │   └── BWRAFCheck.tsx
│   │   ├── postdive/
│   │   │   ├── DepthProfile.tsx
│   │   │   ├── DiveScore.tsx
│   │   │   └── DiveLog.tsx
│   │   └── common/
│   │       ├── LanguageSwitcher.tsx
│   │       ├── UnitToggle.tsx
│   │       └── Slider.tsx
│   ├── scene/           — R3F 3D scene components
│   │   ├── UnderwaterScene.tsx
│   │   ├── Diver.tsx
│   │   ├── Wreck.tsx
│   │   ├── WaterSurface.tsx
│   │   ├── Bubbles.tsx
│   │   ├── Caustics.tsx
│   │   ├── Lighting.tsx
│   │   └── effects/
│   │       ├── UnderwaterFog.tsx
│   │       ├── ColorAbsorption.tsx
│   │       └── MaskVignette.tsx
│   ├── hooks/
│   │   ├── useDiveLoop.ts    — RAF loop updating physics
│   │   ├── useControls.ts    — Keyboard/mouse diver control
│   │   └── useI18n.ts        — i18n convenience hook
│   ├── i18n/
│   │   ├── index.ts          — i18next config
│   │   └── locales/
│   │       ├── en/
│   │       │   ├── common.json
│   │       │   ├── dive.json
│   │       │   ├── gas.json
│   │       │   ├── bwraf.json
│   │       │   ├── computer.json
│   │       │   └── tutorial.json
│   │       └── th/
│   │           ├── common.json
│   │           ├── dive.json
│   │           ├── gas.json
│   │           ├── bwraf.json
│   │           ├── computer.json
│   │           └── tutorial.json
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── format.ts         — Number/unit formatting (Intl)
├── tests/
│   ├── engine/               — Physics unit tests
│   │   ├── buhlmann.test.ts
│   │   ├── gas.test.ts
│   │   └── consumption.test.ts
│   └── components/
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
├── PRD.md
└── CLAUDE.md
```

### 4.3 Zustand Store Design — diveStore

```typescript
interface DiveState {
  // Status
  phase: 'setup' | 'predive' | 'surface' | 'descending' | 'diving' | 'ascending' | 'safety_stop' | 'deco_stop' | 'surfaced' | 'postdive';

  // Environment
  depth: number;              // meters (positive = deeper)
  maxDepth: number;
  temperature: number;        // °C
  ascentRate: number;         // m/min (positive = ascending)

  // Time
  diveTime: number;           // seconds since descent
  elapsedTime: number;        // real wall clock seconds

  // Gas
  tankPressure: number;       // bar
  gasMix: GasMix;             // { fo2, fn2, fhe, label }
  ppo2: number;
  cns: number;                // percentage 0-100+

  // Decompression
  tissues: number[];          // 16 compartment N2 pressures
  tissuesHe: number[];        // 16 compartment He pressures (trimix)
  ndl: number;                // minutes remaining (-1 = in deco)
  ceiling: number;            // meters (0 = safe to surface)
  decoStops: DecoStop[];
  gfLow: number;
  gfHigh: number;

  // Buoyancy
  bcdVolume: number;          // liters
  netBuoyancy: number;        // Newtons

  // Diver
  sacRate: number;            // L/min at surface
  stressMultiplier: number;
  narcosisLevel: number;      // 0.0 - 1.0

  // Warnings
  activeWarnings: Warning[];

  // Dive profile recording
  profileLog: ProfilePoint[];

  // Actions
  tick: (dt: number) => void;
  startDive: () => void;
  endDive: () => void;
  inflateBcd: (amount: number) => void;
  deflateBcd: (amount: number) => void;
  switchGas: (mix: GasMix) => void;
  setDepth: (depth: number) => void;
}
```

### 4.4 Component Hierarchy

```
<App>
  <I18nextProvider>
    <AppShell>
      {phase === 'setup' && <SetupFlow />}
        ├── <TankSelector />
        ├── <GasMixSelector />
        ├── <DiverProfile />
        └── <ComputerSelector />

      {phase === 'predive' && <BWRAFCheck />}

      {phase === 'diving' && (
        <Canvas>                          ← R3F Canvas
          <UnderwaterScene>
            <Lighting />
            <WaterSurface />
            <Caustics />
            <UnderwaterFog />
            <Wreck />
            <Diver />
            <Bubbles />
            <EffectComposer>
              <ColorAbsorption />
              <MaskVignette />
              <ChromaticAberration />
            </EffectComposer>
          </UnderwaterScene>
        </Canvas>
        <DiveComputer skin={selectedSkin} />  ← HTML overlay
        <WarningBanner />
      )}

      {phase === 'postdive' && <PostDiveAnalysis />}
        ├── <DepthProfile />
        ├── <DiveScore />
        └── <DiveLog />
    </AppShell>
  </I18nextProvider>
</App>
```

---

## 5. Dive Computer Skin System — Detail

### 5.1 Skin Registry Pattern

```typescript
// src/skins/registry.ts
const skinRegistry = new Map<string, DiveComputerSkin>();

export function registerSkin(skin: DiveComputerSkin) {
  skinRegistry.set(skin.id, skin);
}

export function getSkin(id: string): DiveComputerSkin {
  return skinRegistry.get(id) ?? skinRegistry.get('default')!;
}

export function getAllSkins(): DiveComputerSkin[] {
  return Array.from(skinRegistry.values());
}
```

### 5.2 Skin Layouts (Conceptual)

**Default Skin** — Educational focus
```
┌──────────────────────────────────────┐
│  DEPTH        NDL          TANK      │
│  24.5m      12 min       150 bar     │
│                                      │
│  [████████░░] NDL Bar                │
│                                      │
│  Gas: EAN32   PPO2: 1.12   CNS: 15% │
│  MOD: 33.7m   ↑ 8m/min    18°C      │
└──────────────────────────────────────┘
```

**Shearwater Style** — 4 data corners
```
┌────────┐                    ┌────────┐
│  24.5  │                    │  150   │
│  DEPTH │                    │  BAR   │
└────────┘                    └────────┘

┌────────┐                    ┌────────┐
│   12   │                    │  35:42 │
│  NDL   │                    │  TIME  │
└────────┘                    └────────┘
         PPO2 1.12  EAN32
```

**Garmin Style** — Circular with gauges
```
        ┌─────────┐
     ╭──│  24.5m  │──╮
    │   │  DEPTH  │   │
    │   └─────────┘   │
    │  ◐ NDL: 12min   │   ← ring gauge
    │  ◑ TANK: 150bar │
     ╰────────────────╯
      EAN32  PPO2:1.12
```

**Suunto Style** — Bold, minimal
```
┌──────────────────────┐
│      2 4 . 5         │  ← very large depth
│   ─────────────      │
│   NDL  12   BAR 150  │
│   PPO2 1.12  ↑8m/min │
│   ▶ EAN32    18°C    │
└──────────────────────┘
```

### 5.3 Future Sponsor Integration
- Skins can include brand logo (with permission)
- Click-through to product page (affiliate)
- Brand-specific color themes and fonts
- "Try before you buy" — students learn on actual computer layout

---

## 6. MV Hardeep Wreck Data (for 3D modeling)

### 6.1 Key Dimensions
- **Vessel:** MV Hardeep — cargo freighter sunk 1942 (WWII torpedo)
- **Location:** Chumphon, Gulf of Thailand
- **Length:** ~100 m
- **Orientation:** Upright on seabed, slight list
- **Depth range:** 15m (top of mast/deck structures) to 27m (seabed)
- **Visibility:** 5–20m (varies by season, Gulf of Thailand conditions)
- **Temperature:** 27–30°C year-round

### 6.2 Dive Areas for Simulator

| Zone | Depth | Cert Level | Dive Scenario |
|------|-------|-----------|---------------|
| Deck structures + mast | 15–18m | Open Water | Basic orientation, buoyancy practice |
| Main deck exploration | 18–22m | OW/AOW | Swim along hull, marine life |
| Bridge area | ~20m | AOW | Structure exploration |
| Cargo holds | 20–25m | AOW | Penetration basics |
| Hull bottom / seabed | 25–27m | AOW/Deep | NDL management, gas planning |
| Full wreck circuit | 15–27m | AOW | Navigation + gas management drill |

**Note:** Hardeep is shallower than Zenobia (max 27m vs 43m), making it ideal for recreational OW/AOW training. Trimix scenarios can use hypothetical deeper sites or adjustable depth parameters.

---

## 7. Educational Scoring System

### 7.1 Three-Layer Scoring

| Layer | What | Points |
|-------|------|--------|
| **Completion** | Correct procedures followed | +100 per procedure |
| **Precision** | Optimal execution (ascent rate, equalization timing) | +10–25 bonus |
| **Efficiency** | Gas management, NDL usage | +25 bonus per metric |

### 7.2 Grade Scale

| Grade | Criteria |
|-------|---------|
| **A** | All safety procedures correct, precision bonuses, gas above reserve |
| **B** | All safety correct, minor precision losses |
| **C** | Completed with 1 procedural error |
| **F** | Safety violation (MOD exceeded, missed deco stop, ascent >18m/min) |

### 7.3 Achievement Badges

- "Perfect Buddy Check" — 10 consecutive error-free BWRAF
- "Gas Miser" — 3 dives with >100 bar remaining
- "NDL Master" — 5 dives surfacing with 5–10 min NDL remaining
- "Nitrox Navigator" — correctly calculate MOD for 5 mixes
- "Safe Ascent" — 10 dives with green-zone ascent + completed safety stop
- "Deep Explorer" — complete Zenobia lower cargo deck scenario
- "Tech Ready" — complete all trimix scenarios with A grade

---

## 8. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| **Performance** | 60 FPS on mid-range desktop, 30 FPS on tablet |
| **Initial load** | < 5 seconds (progressive loading for 3D assets) |
| **Bundle size** | < 500 KB JS (code-split, lazy load 3D) |
| **Browser support** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| **Responsive** | Desktop primary (1280px+), tablet (768px+) |
| **Accessibility** | WCAG 2.1 AA for UI panels (color contrast, keyboard nav) |
| **Offline** | Service worker for core app (PWA-ready) |
| **Physics accuracy** | Bühlmann within 1 min of Shearwater Perdix output |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Dive students who improve NDL understanding | >80% (pre/post quiz) |
| Average session duration | >10 minutes |
| Dive computer brand interest | 2+ brands expressing sponsorship interest |
| Language coverage | 4+ languages within 6 months |
| Monthly active users | 1000+ within 3 months of launch |

---

## 10. Milestones

| Milestone | Deliverable | Timeline |
|-----------|-------------|----------|
| **M1** | Project scaffold + dive physics engine + default HUD | Week 1–2 |
| **M2** | Pre-dive setup flow + gas selection + i18n (EN/TH) | Week 3 |
| **M3** | Basic 3D underwater scene + diver character | Week 4–5 |
| **M4** | Zenobia wreck model + dive scenarios | Week 6–7 |
| **M5** | BWRAF interactive + post-dive analysis | Week 8 |
| **M6** | 4 dive computer skins complete | Week 9 |
| **M7** | Polish, testing, Tier 2 languages | Week 10–12 |
| **M8** | Public launch | Week 12 |
