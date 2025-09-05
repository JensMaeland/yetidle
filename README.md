# 3D Word Game Prototype

Prototype of a 3D letter placement / word building game ("3D Wordle" working title) built with React, Vite and Three.js (react-three-fiber).

## Controls
- WASD / Arrow Keys: Move horizontally
- R / F: Move Up / Down
- Space: Pick up nearest letter (within radius) or place currently held letter one unit in front
- (Future) Q/E: Rotate camera or held letter (not yet implemented)

## Getting Started
Install dependencies and run dev server:

```
npm install
npm run dev
```

Open http://localhost:5173 (default Vite port).

## Next Ideas
- Grid snapping & validation for word rows
- Dictionary check & scoring
- Limit inventory / letter bag spawn system
- Highlight valid placement cells
- Animate pick/place
- Add sound & simple UI for word submission

## License
MIT (prototype stage)
