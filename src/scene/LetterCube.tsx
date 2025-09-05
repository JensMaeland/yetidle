import { useRef } from 'react';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

interface LetterCubeProps {
  char: string;
  position: [number, number, number];
  highlight?: boolean;
  attachToPlayer?: boolean;
  color?: string; // override base color
}

export const LetterCube = ({ char, position, highlight=false, attachToPlayer=false, color }: LetterCubeProps) => {
  const groupRef = useRef<Group>(null!);
  useFrame(({ clock }) => {
    if (!attachToPlayer) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.3;
    }
  });
  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9,0.9,0.9]} />
  <meshStandardMaterial color={color || (highlight ? '#ffcc33' : '#3388ff')} metalness={0.15} roughness={0.55} />
        {/* Front */}
        <Text position={[0,0,0.46]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">{char}</Text>
        {/* Back */}
        <Text rotation={[0,Math.PI,0]} position={[0,0,-0.46]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">{char}</Text>
        {/* Right */}
        <Text rotation={[0, -Math.PI/2, 0]} position={[0.46,0,0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">{char}</Text>
        {/* Left */}
        <Text rotation={[0, Math.PI/2, 0]} position={[-0.46,0,0]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">{char}</Text>
      </mesh>
    </group>
  );
};
