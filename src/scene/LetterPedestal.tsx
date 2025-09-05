import { useRef } from 'react';
import { Group } from 'three';
import { LetterCube } from './LetterCube';
import { useFrame } from '@react-three/fiber';

interface LetterPedestalProps {
  char?: string; // now optional: empty pedestal allowed
  position: [number, number, number];
}

export function LetterPedestal({ char, position }: LetterPedestalProps) {
  const ref = useRef<Group>(null!);
  // Subtle bobbing animation only if a letter is present
  useFrame(({ clock }) => {
    if (ref.current && char) {
      const t = clock.elapsedTime;
      ref.current.position.y = Math.sin(t * 2 + position[0] * 0.2) * 0.05;
    }
  });
  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* Base pedestal */}
      <mesh position={[0,0,0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.25, 20]} />
        <meshStandardMaterial color={char ? "#c9a227" : "#444"} metalness={0.2} roughness={0.5} />
      </mesh>
      <group ref={ref} position={[0,0.25,0]}>
        {char && <LetterCube char={char} position={[0,0.4,0]} highlight />}
      </group>
    </group>
  );
}