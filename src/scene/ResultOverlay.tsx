import React, { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group, Vector3, PerspectiveCamera, Mesh } from 'three';
import { Text } from '@react-three/drei';

interface ResultOverlayProps {
  mode: 'win' | 'lose';
  time?: string;
  targetWord?: string;
  onRestart: () => void;
  distance?: number; // distance in front of camera
}

// A plane that always fills the camera frustum at the chosen distance, with centered text/actions.
export const ResultOverlay: React.FC<ResultOverlayProps> = ({ mode, time, targetWord, onRestart, distance = 4 }) => {
  const { camera, size } = useThree();
  const groupRef = useRef<Group>(null!);
  const planeRef = useRef<Mesh>(null!);
  const tmpDir = useRef(new Vector3());
  const [hover, setHover] = useState(false);

  useFrame(() => {
    // Position group in front of camera
    const dir = tmpDir.current.copy(camera.getWorldDirection(tmpDir.current)).multiplyScalar(distance);
    groupRef.current.position.copy(camera.position).add(dir);
    groupRef.current.quaternion.copy(camera.quaternion);

    // Compute plane size to exactly cover view
    if ('fov' in camera) {
      const fov = (camera as PerspectiveCamera).fov * Math.PI / 180;
      const h = 2 * distance * Math.tan(fov / 2);
      const w = h * (size.width / size.height);
      planeRef.current.scale.set(w, h, 1);
    }
  });

  const mainColor = mode === 'win' ? '#16c96d' : '#1b7fff';
  const glowColor = mode === 'win' ? '#3fff7a' : '#5aaeff';
  const title = mode === 'win' ? 'YOU WIN' : 'GAME OVER';

  return (
    <group ref={groupRef} renderOrder={9999}> {/* ensure drawn late */}
      {/* Background plane */}
      <mesh ref={planeRef} onPointerDown={e=>e.stopPropagation()} renderOrder={0}>
        <planeGeometry args={[1,1]} />
        <meshBasicMaterial color={'#000'} transparent opacity={0.88} depthTest={false} depthWrite={false} />
      </mesh>
      {/* Title */}
      <Text position={[0,0.6,0.01]} fontSize={0.9} anchorX="center" anchorY="middle" color={mainColor} outlineWidth={0.015} outlineColor={glowColor}>
        {title}
      </Text>
      {time && (
        <Text position={[0,0.25,0.01]} fontSize={0.32} anchorX="center" anchorY="middle" color="#ffffff">
          Time: {time}
        </Text>
      )}
      {mode==='win' && targetWord && (
        <Text position={[0, time ? 0.05 : 0.2, 0.01]} fontSize={0.24} anchorX="center" anchorY="middle" color="#dddddd">
          Word: {targetWord}
        </Text>
      )}
      {/* Restart button: now directly below title/time */}
      <group position={[0, time ? -0.1 : -0.15, 0.05]} renderOrder={2}>
        <mesh
          onClick={(e)=>{ e.stopPropagation(); onRestart(); }}
          onPointerOver={()=>setHover(true)}
          onPointerOut={()=>setHover(false)}
          renderOrder={3}
        >
          <planeGeometry args={[2.8,0.62]} />
          <meshBasicMaterial
            color={hover ? mainColor : '#1b7fff'}
            transparent
            opacity={hover ? 1 : 0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <Text position={[0,0,0.051]} fontSize={0.3} anchorX="center" anchorY="middle" color={hover ? '#fff' : '#ffffff'}>
          RESTART
        </Text>
      </group>
    </group>
  );
};

// Simple rounded plane geometry (fallback if not present). If drei's roundedPlane is unavailable, define manually.
// We attempt to attach to THREE namespace via global augmentation only once; guard by existence check.
// For simplicity and minimal deps, approximate with regular plane (already used). Leaving as placeholder.
// If roundedPlaneGeometry isn't defined in environment, user can replace or install an extension; code tolerates absence.