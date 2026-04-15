# nScuba Sim — Hardeep

Web-based scuba dive training simulator set at the MV Hardeep wreck. Built with Three.js for interactive 3D underwater exploration and realistic dive physics.

## Features

**Dive Physics (Accurate)**
- Buhlmann ZHL-16C decompression algorithm (16 tissue compartments)
- Gas consumption following Boyle's Law (deeper = more air consumed)
- BCD buoyancy with Boyle's Law compression/expansion
- NDL, safety stops, deco stops, ceiling tracking
- CNS O2 toxicity, nitrogen narcosis model
- Seawater (1.025 kg/L) vs freshwater (1.000 kg/L) buoyancy difference
- Rule of Thirds gas management

**Dive Computer HUD**
- Real-time depth, NDL, tank pressure (bar + liters), PPO2, ascent rate
- Safety stop countdown (5m / 3 min) with drift warnings
- Deco stop display with ceiling violation alerts
- Tissue loading bar chart (16 compartments)
- Skinnable layout system (Default / Shearwater / Garmin / Suunto style)

**3D Scene**
- Underwater environment with depth-dependent fog, lighting, color absorption
- Chibi diver character with fin kick animation and bubbles
- Placeholder wreck geometry (MV Hardeep)
- Mouse orbit camera + keyboard/touch controls

**Settings**
- Tank selection (6 presets: aluminum + steel)
- Gas mix (Air, EANx32/36/40, custom O2%)
- SAC rate (beginner to tech presets)
- Gradient Factors (GF Low/High)
- Weight belt (0-15 kg)
- Water type (sea/fresh with auto weight suggestion)
- Units (metric/imperial), Language (EN/TH)

**Post-Dive Analysis**
- Depth profile graph with violation markers
- Dive statistics (calculated SAC, max ascent rate, CNS, etc.)
- Grade A/B/C/F with criteria
- Instructor feedback notes

## Controls

| Key | Action |
|-----|--------|
| W / S | Swim forward / backward |
| A / D | Turn left / right |
| Space | Fin kick up (ascend) |
| Shift | Fin kick down (descend) |
| N | Auto neutral buoyancy |
| Mouse drag | Orbit camera |
| Scroll | Zoom in/out |
| 1 / 2 / 3 | Speed 1x / 5x / 30x |
| ESC | End dive |

On-screen buttons available for BCD inflate/deflate and swim up/down (touch/iPad friendly).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 5 |
| Framework | React 18 + TypeScript |
| 3D | Three.js via React Three Fiber |
| State | Zustand |
| i18n | react-i18next (EN + TH) |
| Styling | Tailwind CSS 4 |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

## Project Structure

```
src/
  engine/       — Pure TS dive physics (Buhlmann, gas, buoyancy, narcosis, CNS)
  stores/       — Zustand stores (dive, setup, settings)
  components/   — React UI (HUD, menu, settings, post-dive)
  scene/        — R3F 3D scene (diver, wreck, underwater effects)
  i18n/         — Translations (EN, TH)
  types/        — TypeScript types
mockups/        — UI wireframes (Excalidraw)
PRD.md          — Product Requirements Document
```

## License

MIT
