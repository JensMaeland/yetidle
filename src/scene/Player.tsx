import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { Group, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { LetterCube } from './LetterCube';

interface PlayerProps {
  onAction: () => void;
  heldChar: string | null;
}

export interface PlayerHandle {
  position: Vector3;
}

const SPEED = 4;

export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player({ onAction, heldChar }, ref) {
  const group = useRef<Group>(null!);
  const vel = useRef(new Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  // Camera spherical coordinates (yaw around Y, pitch) relative to player
  const camYaw = useRef(45 * Math.PI/180); // radians
  const camPitch = useRef(35 * Math.PI/180); // radians
  const camRadius = useRef(10); // distance from player

  useImperativeHandle(ref, () => ({ position: group.current.position }), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase(); // e.g., 'keyd'
      keys.current[k] = true;
      keys.current[code] = true; // track code variant too
      if (k === ' ') { e.preventDefault(); onAction(); }
      // Arrow keys -> camera, prevent default scroll
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      keys.current[k] = false;
      keys.current[code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [onAction]);

  useFrame((_, dt) => {
    const k = keys.current;
    vel.current.set(0,0,0);
  // Build intent vector in camera-relative local space (XZ plane)
  let ix = 0, iz = 0;
  if (k['w'] || k['keyw']) iz -= 1;
  if (k['s'] || k['keys']) iz += 1;
  if (k['a'] || k['keya']) ix -= 1;
  if (k['d'] || k['keyd']) ix += 1; // include 'keyd' fallback
  if (ix !== 0 || iz !== 0) {
    const len = Math.hypot(ix, iz); ix /= len; iz /= len;
    // Rotate intent by camera yaw so local forward (0,-1) aligns with camera forward
    const yaw = camYaw.current;
    const sin = Math.sin(yaw); const cos = Math.cos(yaw);
    // Rotation matrix chosen so:
    // local forward (0,-1) -> (-cos, -sin)
    // local right   (1, 0) -> ( sin, -cos)
    const wx = ix * sin + iz * cos;
    const wz = ix * -cos + iz * sin;
    vel.current.x = wx;
    vel.current.z = wz;
  }
    if (k['r']) vel.current.y += 1;
    if (k['f']) vel.current.y -= 1;
    vel.current.normalize().multiplyScalar(SPEED * dt);
    group.current.position.add(vel.current);

    // keep above floor
    if (group.current.position.y < 0.5) group.current.position.y = 0.5;

    // Camera orbit controls via arrow keys
    const ROT_SPEED = 1.5; // radians/sec
    const PITCH_SPEED = 1.2;
    if (k['arrowleft']) camYaw.current += ROT_SPEED * dt;
    if (k['arrowright']) camYaw.current -= ROT_SPEED * dt;
    if (k['arrowup']) camPitch.current += PITCH_SPEED * dt;
    if (k['arrowdown']) camPitch.current -= PITCH_SPEED * dt;
    // Clamp pitch (avoid flipping)
    const minPitch = 10 * Math.PI/180;
    const maxPitch = 80 * Math.PI/180;
    if (camPitch.current < minPitch) camPitch.current = minPitch;
    if (camPitch.current > maxPitch) camPitch.current = maxPitch;

    const target = group.current.position;
    const r = camRadius.current;
    const cy = camYaw.current;
    const cp = camPitch.current;
    // Convert spherical to cartesian (y is up)
    const camTargetPos = new Vector3(
      target.x + r * Math.cos(cp) * Math.cos(cy),
      target.y + r * Math.sin(cp),
      target.z + r * Math.cos(cp) * Math.sin(cy)
    );
    camera.position.lerp(camTargetPos, 0.15);
    camera.lookAt(target);

  });

  return (
    <group ref={group} position={[0,0.5,4]}>
      <mesh castShadow>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial color="#ff6699" />
      </mesh>
      {heldChar && <group position={[0,0.9,0]}><LetterCube char={heldChar} position={[0,0,0]} /></group>}
    </group>
  );
});
