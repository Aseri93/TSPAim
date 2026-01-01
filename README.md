# TSP Aim Trainer

[![CI](https://github.com/Aseri93/TSPAim/actions/workflows/ci.yml/badge.svg)](https://github.com/Aseri93/TSPAim/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Free browser-based aim trainer with Kovaaks-style scenarios. No download required.

🎯 **[Play Now →](https://tsp-aim.vercel.app)**

## Features

- **8 Training Scenarios** — Static, strafing, tracking, calibration, frenzy
- **Unlimited FPS** — Bypasses VSync for maximum performance
- **TSP Path Guidance** — Shows optimal target order
- **Analytics Dashboard** — Visualize Score vs DPI/Resolution
- **Local & Global Leaderboards** — Track your progress
- **Zero Input Lag** — Raw mouse input with pointer lock

## Scenarios

| Scenario | Type | Description |
|----------|------|-------------|
| **Static Grid** | Click | 6 static targets, respawn on hit |
| **Tiny 15s** | Click | 10 tiny targets, 15 seconds |
| **Strafing Click** | Click | Targets move left/right |
| **Smooth Track** | Tracking | Keep cursor on moving target |
| **🔥 Adaptive Track** | Tracking | Speed increases with accuracy! |
| **Visual Reaction** | Reaction | Click when screen turns red |
| **Target Frenzy 100** | Frenzy | Clear 100 static targets |
| **🌀 Strafing Frenzy 100** | Frenzy | Clear 100 moving targets |
| **🧭 Compass Rose** | Calibration | Edge-to-edge precision test |

## Getting Started

### Play Online
Visit the live site (link above) — works on any modern browser.

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Tech Stack

- **Preact** — Lightweight React alternative
- **Vite** — Fast build tool
- **Canvas API** — High-performance rendering
- **Supabase** — Optional global leaderboards

## Performance

- Targets 1000+ FPS in Unlimited mode
- Canvas-based rendering (no DOM thrashing)
- MessageChannel game loop (bypasses setTimeout limits)
- Resolution-independent (1080p, 1440p, ultrawide support)

## Controls

| Key | Action |
|-----|--------|
| **Click** | Shoot target |
| **ESC** | Exit to menu |
| **🏠 Logo** | Return to home |

## Leaderboards

The app works in **Offline Mode** by default. To enable global leaderboards:

1. Create a [Supabase](https://supabase.com) project
2. Copy `.env.example` to `.env.local`
3. Add your Supabase URL and anon key

## License

MIT
