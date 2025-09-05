import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter } from 'three';

export function WorldFloor() {
  const grass = useLoader(TextureLoader, '/greenGrass.jpg');
  // Configure texture (repeat & color space)
  useMemo(() => {
    grass.wrapS = grass.wrapT = RepeatWrapping;
    // Reduce repetition to avoid visible grid tiling pattern
    grass.repeat.set(6, 6);
    // Softer filtering to hide seam lines
    grass.minFilter = LinearMipmapLinearFilter;
    grass.magFilter = LinearFilter;
    grass.anisotropy = 4;
    grass.needsUpdate = true;
  }, [grass]);
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
  <meshStandardMaterial map={grass} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}
