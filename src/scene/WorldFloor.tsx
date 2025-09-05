import React from 'react';

export function WorldFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#111" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
