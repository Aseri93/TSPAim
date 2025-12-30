# TSP Aim Trainer

Free browser-based aim trainer with Kovaaks-style scenarios. No download required.

🎯 **[Play Now →](https://your-url-here.vercel.app)** *(Update after deployment)*

## Features

- **9 Training Scenarios** — Static, strafing, tracking, reaction
- **Unlimited FPS** — Bypasses VSync for maximum performance
- **TSP Path Guidance** — Shows optimal target order
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
| **Reaction Test** | Reaction | Click when target appears |
| **Visual Reaction** | Reaction | Click when screen turns red |
| **Target Frenzy 100** | Frenzy | Clear 100 static targets |
| **🌀 Strafing Frenzy 100** | Frenzy | Clear 100 moving targets |
| **👑 Grubby RTS Calibration** | Calibration | Test your mousepad coverage |

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
- Tested on M2 MacBook Air at 1440p

## Controls

| Key | Action |
|-----|--------|
| **Click** | Shoot target |
| **ESC** | Exit to menu |

## Leaderboards

The app works in **Offline Mode** by default. To enable global leaderboards:

1. Create a [Supabase](https://supabase.com) project
2. Copy `.env.example` to `.env.local`
3. Add your Supabase URL and anon key

## License

MIT
