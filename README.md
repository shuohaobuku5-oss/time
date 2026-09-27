# I WANT TO CONTROL TIME

An immersive, single-screen photographic installation. This is the original project, with its existing photographs, visual design, and motion preserved.

## Run and validate

Requires Node.js 20 or later. The browser libraries are bundled locally; there are no npm runtime dependencies or external font requests.

```sh
npm run build
npm start
```

Open http://127.0.0.1:4173. The build command validates the JavaScript, JPEG files, and asset references and serves the existing `dist` output without regenerating the design.

## Vercel

Import this repository with the repository root as the project root. `vercel.json` selects the existing `dist` directory, runs the validation build, and requires no dependency installation or environment variables. Keep the Git repository connected for subsequent production deployments.

## Structure

- `dist/index.html`: accessible clock and timeline interface
- `dist/style.css`: responsive visual system
- `dist/app.js`: time, GSAP transitions, and Three.js environment
- `dist/assets/`: five supplied photographs (unaltered originals copied as JPEG)
- `dist/vendor/`: locally bundled Three.js 0.180.0 and GSAP 3.13.0
- `scripts/check.mjs`: deployment asset and syntax validation
- `scripts/serve.mjs`: dependency-free local HTTP server
- `vercel.json`: production deployment configuration
- `.openai/hosting.json`: private Sites deployment identity

## Image analysis and approach

The provided attachment order is not chronological. Visual mapping: red ocean / 8416359265683039809 → sunset; golden beach / 5233031726282964978 → golden hour; blue harbour / 8635285523356558028 → blue hour; mountain / 8800635314907943783 → night; starry coast / 1337825675052690449 → starry sky. The requested Sunset → Golden Hour order is retained as an artistic sequence; clock labels are authored, not inferred capture times.

These photographs have different viewpoints, horizon heights, and foregrounds. The renderer aligns their horizons and uses continuous colour and exposure interpolation, sky/foreground motion, and photographic dissolves. It does not claim to reconstruct one physical landscape. Source widths are around 1170 pixels; larger original photographs would improve sharpness on 4K displays.

## Controls and compatibility

Drag the timeline in either direction, select a phase, or use the arrow keys. Home and End work when the slider is focused. Playback stops at the final starry-sky frame. The fullscreen control supports standard and WebKit fullscreen APIs; browsers that prohibit element fullscreen display a clear explanation. Reduced-motion preferences disable ambient motion. A photographic crossfade fallback remains available when WebGL cannot initialize.
