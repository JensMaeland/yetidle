import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Game } from './../src/scene/Game'

function App() {
  return (
    <>
      <div className="hud" style={{display:'flex',flexDirection:'column',gap:4}}>
        <div>
          <strong>3D Word Game (Prototype)</strong><br />
          WASD / Arrows: Move | Space: Pick / Place | R/F: Up/Down
        </div>
        <button onClick={()=>location.reload()} style={{
          alignSelf:'flex-start',
          background:'#1b7fff',
          color:'#fff',
          border:'1px solid #fff',
          borderRadius:6,
          fontSize:12,
          padding:'4px 10px',
          cursor:'pointer',
          fontWeight:600,
          letterSpacing:'0.05em'
        }}>Restart</button>
      </div>
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 90 }}>
        <color attach="background" args={["#05070a"]} />
        <fogExp2 attach="fog" args={["#0c1016", 0.04]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[18, 25, 12]}
          intensity={1.15}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          // Expand orthographic shadow camera so shadows persist away from center
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
          shadow-camera-near={0.5}
            shadow-camera-far={120}
          // Slight bias to reduce acne
          shadow-bias={-0.0005}
          shadow-normalBias={0.02}
        />
        <Stars radius={8} depth={40} count={20000} factor={4} fade />
  {/* Removed large debug Grid to eliminate visible square pattern behind grass */}
        <Game />
        <OrbitControls makeDefault enablePan={false} />
      </Canvas>
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
