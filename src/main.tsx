import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stars } from '@react-three/drei';
import { Game } from './../src/scene/Game'

function App() {
  return (
    <>
      <div className="hud">
        <strong>3D Word Game (Prototype)</strong><br />
        WASD / Arrows: Move | Space: Pick / Place | Q/E: Yaw | R/F: Up/Down
      </div>
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 55 }}>
        <color attach="background" args={["#05070a"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5,10,5]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Stars radius={80} depth={40} count={4000} factor={4} fade />
        <Grid infiniteGrid sectionColor={"#444"} cellColor={"#222"} />
        <Game />
        <OrbitControls makeDefault enablePan={false} />
      </Canvas>
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
