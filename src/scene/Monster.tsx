import React, { useRef, useEffect } from 'react';
import { Group, Vector3, MeshStandardMaterial } from 'three';
import { useFrame } from '@react-three/fiber';

export interface MonsterData {
  id: number;
  speed: number; // units per second
  position: [number, number, number];
  color: string;
}

interface MonsterProps {
  data: MonsterData;
  targetRef: React.RefObject<{ position: Vector3 } | null>;
  onCatch?: () => void;
}

export const Monster: React.FC<MonsterProps> = ({ data, targetRef, onCatch }) => {
  const group = useRef<Group>(null!);
  const caughtRef = useRef(false);
  // Set initial spawn position only once (avoid reset on re-render)
  useEffect(() => {
    if (group.current) group.current.position.set(...data.position);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPos = useRef(new Vector3());
  const tAccum = useRef(0);

  useFrame((_, dt) => {
    if (!group.current || !targetRef.current) return;
    tAccum.current += dt;
    const pos = group.current.position;
    const target = targetRef.current.position;
    const dir = new Vector3().subVectors(target, pos);
    const dist = dir.length();
    if (dist > 0.01) {
      dir.normalize();
      const step = data.speed * dt;
      if (step >= dist) pos.copy(target); else pos.addScaledVector(dir, step);
      // face movement direction smoothly
      const yaw = Math.atan2(dir.x, dir.z);
      // rotate only the root (y-axis)
      group.current.rotation.y = yaw;
    }
    // collision check
    if (!caughtRef.current && dist < 0.9) {
      caughtRef.current = true;
      onCatch && onCatch();
    }
    // limb animation
    const walkSpeed = 6; // swing speed base
    const sway = Math.sin(tAccum.current * walkSpeed) * 0.4;
    const armL = group.current.getObjectByName('armL');
    const armR = group.current.getObjectByName('armR');
    const legL = group.current.getObjectByName('legL');
    const legR = group.current.getObjectByName('legR');
    const moving = !lastPos.current.equals(pos);
    const intensity = moving ? 1 : 0; // freeze limbs when idle
    if (armL) armL.rotation.x =  0.6 + sway * 0.6 * intensity;
    if (armR) armR.rotation.x =  0.6 - sway * 0.6 * intensity;
    if (legL) legL.rotation.x = -0.4 - sway * 0.5 * intensity;
    if (legR) legR.rotation.x = -0.4 + sway * 0.5 * intensity;
    lastPos.current.copy(pos);
  });

  // stylized yeti colors
  const furColor = '#f4f6f7';
  const accent = data.color; // use provided palette color as accent
  const skinColor = '#5aa2ff';

  return (
    <group ref={group}> {/* root positioned externally */}
      {/* Shadow base (foot shadow) */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.02,0]} receiveShadow>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial color={'#0d0d10'} roughness={1} metalness={0} />
      </mesh>
      {/* Body */}
      <mesh castShadow position={[0,0.9,0]}> 
        <capsuleGeometry args={[0.55, 0.6, 8, 16]} />
        <meshStandardMaterial color={furColor} roughness={0.95} metalness={0} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0,1.55,0]}> 
        <sphereGeometry args={[0.45, 18, 18]} />
        <meshStandardMaterial color={furColor} roughness={0.95} />
      </mesh>
      {/* Face plate */}
      <mesh position={[0,1.52,0.34]}> 
        <sphereGeometry args={[0.28, 16, 16, 0, Math.PI*2, 0, Math.PI/1.6]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.12,1.62,0.57]}> <sphereGeometry args={[0.055,12,12]} /> <meshStandardMaterial color={'#111'} /> </mesh>
      <mesh position={[0.12,1.62,0.57]}> <sphereGeometry args={[0.055,12,12]} /> <meshStandardMaterial color={'#111'} /> </mesh>
      {/* Mouth */}
      <mesh position={[0,1.48,0.58]}> <boxGeometry args={[0.16,0.07,0.02]} /> <meshStandardMaterial color={'#222'} /> </mesh>
      {/* Accent crest */}
      <mesh position={[0,1.88,0]}> <coneGeometry args={[0.22,0.28,6]} /> <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} roughness={0.4} /> </mesh>
      {/* Arms */}
      <group name="armL" position={[-0.7,1.25,0]} rotation={[0.6,0,0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.18,0.45,6,12]} />
          <meshStandardMaterial color={furColor} roughness={0.95} />
        </mesh>
        <mesh position={[0,-0.45,0]} castShadow>
          <sphereGeometry args={[0.20, 14,14]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>
      <group name="armR" position={[0.7,1.25,0]} rotation={[0.6,0,0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.18,0.45,6,12]} />
          <meshStandardMaterial color={furColor} roughness={0.95} />
        </mesh>
        <mesh position={[0,-0.45,0]} castShadow>
          <sphereGeometry args={[0.20, 14,14]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>
      {/* Legs */}
      <group name="legL" position={[-0.25,0.55,0]} rotation={[-0.4,0,0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.22,0.35,6,12]} />
          <meshStandardMaterial color={furColor} roughness={0.95} />
        </mesh>
        <mesh position={[0,-0.35,0.05]} castShadow>
          <boxGeometry args={[0.32,0.14,0.44]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>
      <group name="legR" position={[0.25,0.55,0]} rotation={[-0.4,0,0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.22,0.35,6,12]} />
          <meshStandardMaterial color={furColor} roughness={0.95} />
        </mesh>
        <mesh position={[0,-0.35,0.05]} castShadow>
          <boxGeometry args={[0.32,0.14,0.44]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>
    </group>
  );
};
