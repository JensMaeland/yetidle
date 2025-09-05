import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { Group, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { LetterCube } from './LetterCube';

interface PlayerProps {
  onAction: () => void;
  onThrow?: () => void; // triggered when pressing E (throw held eliminated letter)
  heldChar: string | null;
  frozen?: boolean; // when true, stop movement & camera orbit
}

export interface PlayerHandle {
  position: Vector3;
  rotation: { y: number };
}

const SPEED = 12;

export const Player = forwardRef<PlayerHandle, PlayerProps>(function Player({ onAction, onThrow, heldChar, frozen }, ref) {
  const group = useRef<Group>(null!);
  const vel = useRef(new Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const { camera } = useThree();
  // Camera spherical coordinates (yaw around Y, pitch) relative to player
  const camYaw = useRef(45 * Math.PI/180); // radians
  const camPitch = useRef(35 * Math.PI/180); // radians
  const camRadius = useRef(10); // distance from player

  useImperativeHandle(ref, () => ({ position: group.current.position, rotation: group.current.rotation }), []);

  // Action animation state
  const actionRef = useRef<{ type: 'idle' | 'pickup' | 'putdown' | 'throw'; t: number; duration: number }>({ type: 'idle', t: 0, duration: 0 });
  const prevHeldRef = useRef<string | null>(heldChar);
  const pendingThrowRef = useRef(false); // set on throw key press before state updates

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code.toLowerCase(); // e.g., 'keyd'
      keys.current[k] = true;
      keys.current[code] = true; // track code variant too
      if (k === ' ') { e.preventDefault(); onAction(); }
      if (k === 'e') { 
        e.preventDefault(); 
        // mark throw intent (if currently holding a letter) so we can select correct animation
        if (heldChar) pendingThrowRef.current = true; 
        onThrow && onThrow(); 
      }
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
    if (frozen) {
      // Even when frozen, keep avatar facing away from camera (back of head toward camera)
      const p = group.current.position;
      const cx = camera.position.x - p.x;
      const cz = camera.position.z - p.z;
      group.current.rotation.y = Math.atan2(cx, cz);
      return; // skip movement
    }
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
  // Face away from camera so camera sees the back of head.
  // Compute yaw from player to camera (player->camera vector) so forward is opposite of camera view vector.
  const p = group.current.position;
  const cx = camera.position.x - p.x;
  const cz = camera.position.z - p.z;
  group.current.rotation.y = Math.atan2(cx, cz);

  });

  // Limb refs for animation
  const armL = useRef<Group>(null!);
  const armR = useRef<Group>(null!);
  const legL = useRef<Group>(null!);
  const legR = useRef<Group>(null!);
  const timeRef = useRef(0);
  const lastPos = useRef(new Vector3());

  useFrame((_, dt) => {
    // (movement already processed above unless frozen)
    timeRef.current += dt;
    if (frozen) return; // keep pose when frozen

    // Detect heldChar transitions for pickup / putdown
    if (prevHeldRef.current !== heldChar) {
      const before = prevHeldRef.current;
      const after = heldChar;
      if (!before && after) {
        // picked up
        actionRef.current = { type: 'pickup', t: 0, duration: 0.45 };
      } else if (before && !after) {
        // either putdown or throw (throw flagged earlier)
        if (pendingThrowRef.current) {
          actionRef.current = { type: 'throw', t: 0, duration: 0.38 };
        } else {
          actionRef.current = { type: 'putdown', t: 0, duration: 0.4 };
        }
        pendingThrowRef.current = false;
      }
      prevHeldRef.current = heldChar;
    }

    // Advance action animation timer
    if (actionRef.current.type !== 'idle') {
      actionRef.current.t += dt;
      if (actionRef.current.t >= actionRef.current.duration) {
        actionRef.current.type = 'idle';
      }
    }

    const pos = group.current.position;
    const moved = pos.distanceToSquared(lastPos.current) > 0.0001;
    const swing = moved ? Math.sin(timeRef.current * 10) : 0;
    // Basic opposing swings
    let armLRot = swing * 0.6;
    let armRRot = -swing * 0.6;

    // Override with action animation curves
    if (actionRef.current.type !== 'idle') {
      const { type, t, duration } = actionRef.current;
      const u = Math.min(1, t / duration); // normalized 0..1
      // Ease helpers
      const easeInOut = (x:number)=> x<0.5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2;
      const easeOut = (x:number)=> 1 - Math.pow(1-x,2);
      if (type === 'pickup') {
        // reach up then return
        const phase = u < 0.5 ? easeOut(u/0.5) : easeOut((1-u)/0.5);
        armRRot = -phase * 1.1; // raise forward/up
        armLRot = phase * 0.3;
      } else if (type === 'putdown') {
        const phase = u < 0.5 ? easeInOut(u/0.5) : easeInOut((1-u)/0.5);
        armRRot = phase * 0.9; // lower backward
        armLRot = -phase * 0.2;
      } else if (type === 'throw') {
        // quick wind-up then snap
        if (u < 0.25) {
          const wind = easeOut(u/0.25);
          armRRot = wind * 0.8; // wind back
        } else {
          const rel = (u-0.25)/0.75; // 0..1 release
            armRRot = -easeOut(rel) * 1.4; // snap forward
        }
        armLRot = 0.1 * Math.sin(u * Math.PI * 2); // minor counter motion
      }
    }

    if (armL.current) armL.current.rotation.x = armLRot;
    if (armR.current) armR.current.rotation.x = armRRot;
    if (legL.current) legL.current.rotation.x = -swing * 0.6;
    if (legR.current) legR.current.rotation.x = swing * 0.6;
    lastPos.current.copy(pos);
  });

  return (
    <group ref={group} position={[0,0.5,4]}>
      {/* Ground circle indicator */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]} renderOrder={-1}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Minecraft-style blocky avatar (approximate proportions) */}
      {/* Torso */}
      <mesh castShadow position={[0,0.95,0]}>
        <boxGeometry args={[0.6,0.75,0.32]} />
        <meshStandardMaterial color="#3a6ea5" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0,1.45,0]}>
        <boxGeometry args={[0.5,0.5,0.5]} />
        <meshStandardMaterial color="#d7b599" />
      </mesh>
      {/* Arms */}
      <group ref={armL} position={[-0.46,1.15,0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2,0.7,0.2]} />
          <meshStandardMaterial color="#3a6ea5" />
        </mesh>
      </group>
      <group ref={armR} position={[0.46,1.15,0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2,0.7,0.2]} />
          <meshStandardMaterial color="#3a6ea5" />
        </mesh>
      </group>
      {/* Legs */}
      <group ref={legL} position={[-0.18,0.5,0]}>
        <mesh castShadow>
          <boxGeometry args={[0.24,0.7,0.24]} />
          <meshStandardMaterial color="#2d3e72" />
        </mesh>
      </group>
      <group ref={legR} position={[0.18,0.5,0]}>
        <mesh castShadow>
          <boxGeometry args={[0.24,0.7,0.24]} />
          <meshStandardMaterial color="#2d3e72" />
        </mesh>
      </group>
      {/* Held letter - float above head */}
      {heldChar && <group position={[0,1.9,0]}><LetterCube char={heldChar} position={[0,0,0]} /></group>}
    </group>
  );
});
