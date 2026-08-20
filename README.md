# Fitness Tracker

A lightweight, privacy-first workout checklist built with TypeScript. It turns the included strength program and training-max data into a mobile-friendly daily checklist, with percentage-based weights calculated in the browser.

[View the live demo](https://fitness-tracker-murex-two.vercel.app/)

## Privacy model

- The workout and training-max files in `workouts/` are intentionally included in the public project.
- Completed sets are stored in the visitor's browser with `localStorage`.
- There are no accounts, analytics, cookies, databases, or write APIs.
- Vercel project-link metadata and environment files are excluded from Git.

Clearing site data removes all saved completion progress.

## Features

- Day-by-day workout tabs
- Individual and whole-day completion controls
- Automatic weights from percentages of a training max
- AMRAP and bodyweight set support
- Responsive, accessible interface
- Installable web app manifest
- Zero runtime dependencies

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run build      # Compile TypeScript into public/assets
npm run typecheck  # Check types without emitting files
npm test           # Build and run the Node test suite
npm run check      # Typecheck and test
```

## Workout data

- [`workouts/current.json`](workouts/current.json) is the program displayed by the app.
- [`workouts/onerepmax.json`](workouts/onerepmax.json) provides weights for percentage calculations.
- The other files in `workouts/` are retained program snapshots and templates.

A set accepts `reps`, `isAmrap`, and an optional `percentage`. Omit `percentage` or set it to `0` for bodyweight work.

```json
{
  "reps": 5,
  "isAmrap": false,
  "percentage": 75
}
```

The build copies these files unchanged into the static site output.

## Project structure

```text
.
├── public/
│   ├── index.html
│   ├── manifest.webmanifest
│   └── styles.css
├── scripts/               # Build helper and local static server
├── src/
│   ├── app.ts             # UI and browser-only persistence
│   └── core.ts            # Validation and weight calculations
├── tests/core.test.mjs
├── workouts/              # Workout programs and training maxes
└── vercel.json
```

## Deploy to Vercel

Import the repository into Vercel with the framework preset set to **Other**. The included configuration runs `npm run build` and publishes the `public` directory.

## License

[MIT](LICENSE)
