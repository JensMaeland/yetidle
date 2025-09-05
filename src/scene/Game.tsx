import React, { useState, useCallback, useRef } from 'react';
// Using drei Html for reliable overlay within the canvas
import { Html } from '@react-three/drei';
import { ResultOverlay } from './ResultOverlay';
import { Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { LetterCube } from './LetterCube';
import { Player } from './Player';
import { WorldFloor } from './WorldFloor';
import { WordBoard } from './WordBoard';
import { randomWord } from '../logic/wordList';
import { Monster, MonsterData } from './Monster';

export type HeldLetter = { char: string } | null;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function Game() {
  // Tunable constants
  const MONSTER_BORDER_RADIUS = 1.6; // invisible border radius for projectile detection
  const PROJECTILE_TRAIL_MAX = 25; // increased trail length
  const PROJECTILE_TRAIL_BASE_SCALE = 0.5; // base scale added to alpha-based scaling
  const PROJECTILE_TRAIL_SCALE_MULT = 1.1; // multiplier for alpha scaling
  // Pedestal spacing & interaction radii
  const SLOT_SPACING = 2.0; // was 1.2
  const SLOT_PLACE_RADIUS = 1.3; // was ~0.9
  const SLOT_PICK_RADIUS = 1.2; // was 0.8
  const [held, setHeld] = useState<HeldLetter>(null);
  const playerRef = useRef<{ position: Vector3; rotation: { y: number } } | null>(null);
  const [letters, setLetters] = useState<{ id:number; char:string; position:[number,number,number]; placed:boolean;}[]>([]);
  const [target] = useState(() => randomWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<("blue"|"yellow"|"gray")[][]>([]);
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(()=>new Set()); // letters confirmed absent
  const startTimeRef = useRef<number>(performance.now());
  const slotPositions: [number,number,number][] = [-2,-1,0,1,2].map(x=>[x*SLOT_SPACING,0,-20]);
  const [slots,setSlots] = useState<Array<{id:number;char:string}|null>>([null,null,null,null,null]);
  const lockInPos: [number,number,number] = [0,0.5,-22];
  interface Projectile { id:number; char:string; position:Vector3; velocity:Vector3; trail: Vector3[]; }
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  interface Explosion { id:number; position:Vector3; age:number; maxAge:number; }
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const monsterPositionsRef = useRef<Map<number, Vector3>>(new Map());
  // Cumulative non-correct letter tracking (for spawning monsters)
  const cumulativeWrongRef = useRef(0); // sum of letters that are NOT correct (i.e. not blue) across all guesses so far
  const totalSpawnedRef = useRef(0);    // total monsters spawned so far (lifetime)

  const evaluateGuess = (guess:string)=>{
    const colors:("blue"|"yellow"|"gray")[] = Array(5).fill('gray');
    const tArr = target.split('');
    const used = Array(5).fill(false);
    for (let i=0;i<5;i++){ if(guess[i]===tArr[i]) { colors[i]='blue'; used[i]=true; } }
    for (let i=0;i<5;i++){ if(colors[i]==='blue') continue; const ch=guess[i]; let f=-1; for(let j=0;j<5;j++){ if(!used[j]&& tArr[j]===ch && guess[j]!==tArr[j]){ f=j; break;} } if(f!==-1){ colors[i]='yellow'; used[f]=true; } }
  setGuesses(g=>[...g,guess]); setFeedback(f=>[...f,colors]);
  // Mark eliminated letters (those not appearing anywhere in target)
  const unique = new Set(guess.split(''));
  setEliminated(prev => {
    const next = new Set(prev);
    unique.forEach(ch => { if (!target.includes(ch)) next.add(ch); });
    return next;
  });
  const isWin = guess === target;
  if (isWin) {
    setGameWon(true);
    setElapsed((performance.now() - startTimeRef.current) / 1000);
  } else {
  // Count non-correct (not blue) letters this guess (includes yellow + gray)
  const notCorrectThisGuess = colors.filter(c => c !== 'blue').length;
  cumulativeWrongRef.current += notCorrectThisGuess; // update cumulative non-correct letters
  // Desired total monsters = 2 * cumulative non-correct letters
  const desiredTotal = cumulativeWrongRef.current * 2;
  let toSpawn = desiredTotal - totalSpawnedRef.current;
      if (toSpawn > 0) {
        const monsterPalette = ['#ff4444','#ff8844','#ffcc44','#ffee55','#ffffff'];
        const px = playerRef.current?.position.x || 0;
        const pz = playerRef.current?.position.z || 0;
        const spawnRadius = 15;
        const newMonsters: MonsterData[] = [];
        for (let i=0; i<toSpawn; i++) {
          const angle = Math.random()*Math.PI*2;
          const mx = px + Math.cos(angle)*spawnRadius;
          const mz = pz + Math.sin(angle)*spawnRadius;
          // Speed escalation based on lifetime spawn index
          const spawnIndex = totalSpawnedRef.current + i + 1; // 1-based index
          const speed = 1.5 + spawnIndex * 0.1; // gentler slope than before per monster
          const color = monsterPalette[Math.min(monsterPalette.length-1, spawnIndex-1)];
          newMonsters.push({ id: Date.now() + i, speed, position:[mx,0.5,mz], color });
        }
        totalSpawnedRef.current += toSpawn;
        if (newMonsters.length) setMonsters(ms => ms.concat(newMonsters));
      }
  }
  };

  const ringPos = (idx:number):[number,number,number] => {
    const angle=(idx/ALPHABET.length)*Math.PI*2; const r=10; return [Math.cos(angle)*r,0.6,Math.sin(angle)*r];
  };

  const pickOrPlace = useCallback(()=>{
  if (gameOver || gameWon) return; // disable interaction when over or won
    if(!playerRef.current) return;
    const p = playerRef.current.position;

    if(held){
      // If back near its gold source (ring) just discard (infinite supply)
      const idx = ALPHABET.indexOf(held.char);
      if (idx !== -1) {
        const [rx,ry,rz] = ringPos(idx);
        if (Math.hypot(rx - p.x, rz - p.z) < 1.2) { setHeld(null); return; }
      }
  // place into nearest empty slot (larger radius)
  let best=-1; let bestDist=SLOT_PLACE_RADIUS;
      slotPositions.forEach((pos,i)=>{
        if(slots[i]) return;
        const d=Math.hypot(pos[0]-p.x, pos[2]-p.z);
        if(d<bestDist){bestDist=d; best=i;}
      });
      if(best!==-1){
        setSlots(s=>{ const n=[...s]; n[best]={ id:Date.now(), char:held.char }; return n; });
        setHeld(null);
        return;
      }
  // (no placement onto infinite source letters)
      // drop world letter if nothing else
      const drop: [number,number,number] = [Math.round(p.x), Math.max(0.5, Math.round(p.y)), Math.round(p.z-1)];
      setLetters(ls=>ls.concat({ id:Date.now(), char:held.char, position:drop, placed:true }));
      setHeld(null);
      return;
    } else {
      // attempt lock-in
      const buttonD = Math.hypot(lockInPos[0]-p.x, lockInPos[2]-p.z);
      if(buttonD<1.2 && slots.every(s=>s) && guesses.length<6){
        const guess = slots.map(s=>s!.char).join('');
        evaluateGuess(guess);
        setSlots([null,null,null,null,null]);
        return;
      }
      // pick world letter
      let nearest=-1; let nd=1.0;
      letters.forEach((l,i)=>{ const d=Math.hypot(l.position[0]-p.x,l.position[2]-p.z); if(d<nd){nd=d; nearest=i;} });
      if(nearest!==-1){
        const letter=letters[nearest];
        setLetters(ls=>ls.filter(l=>l.id!==letter.id));
        setHeld({ char:letter.char });
        return;
      }
  // pick from slot (larger pickup radius)
  let slotPick=-1; let spd=SLOT_PICK_RADIUS;
      slotPositions.forEach((pos,i)=>{ if(!slots[i]) return; const d=Math.hypot(pos[0]-p.x,pos[2]-p.z); if(d<spd){spd=d; slotPick=i;} });
      if(slotPick!==-1){
        const ltr=slots[slotPick]!;
        setSlots(s=>{ const n=[...s]; n[slotPick]=null; return n; });
        setHeld({ char:ltr.char });
        return;
      }
      // pick from infinite ring (does not deplete)
      for(let i=0;i<ALPHABET.length;i++){
        const pos = ringPos(i);
        const d = Math.hypot(pos[0]-p.x, pos[2]-p.z);
        if(d<1.2){ setHeld({ char: ALPHABET[i] }); return; }
      }
    }
  }, [held, letters, slots, guesses, target, gameOver, gameWon]);

  // Throw held eliminated letter (single-use) on E
  const throwLetter = useCallback(()=>{
    if (gameOver || gameWon) return;
    if (!held) return;
    if (!eliminated.has(held.char)) return; // only eliminated letters can be thrown
    if (!playerRef.current) return;
    const origin = playerRef.current.position.clone();
  const yaw = (playerRef.current as any).rotation.y as number;
  // Previous vector pointed opposite of perceived forward; flip sign to shoot where player is facing.
  const forward = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    const projectileSpeed = 28;
  setProjectiles(ps => ps.concat({ id: Date.now(), char: held.char, position: origin.clone().add(new Vector3(0,1.4,0)), velocity: forward.multiplyScalar(projectileSpeed), trail: [] }));
    setHeld(null); // consume letter
  }, [held, eliminated, gameOver, gameWon]);

  // Update projectiles + monster collision using live positions (border detection) + explosions + trails
  useFrame((_, dt)=>{
    if (projectiles.length) {
      setProjectiles(prev => prev.map(p => {
        // advance
        p.position.addScaledVector(p.velocity, dt);
        // trail capture (every frame, keep last 10)
        p.trail.push(p.position.clone());
        if (p.trail.length > PROJECTILE_TRAIL_MAX) p.trail.shift();
        return p;
      }).filter(p => p.position.length() < 140));
    }
    // update explosions
    if (explosions.length) {
      setExplosions(prev => prev.map(e => ({ ...e, age: e.age + dt })).filter(e => e.age < e.maxAge));
    }
    if (!projectiles.length || monsterPositionsRef.current.size===0) return;
    const hitProj = new Set<number>();
    const hitMon = new Set<number>();
    for (const [id,pos] of monsterPositionsRef.current.entries()) {
      for (const proj of projectiles) {
        if (hitProj.has(proj.id)) continue;
        const dx = pos.x - proj.position.x;
        const dz = pos.z - proj.position.z;
        const dist = Math.hypot(dx,dz);
        if (dist < MONSTER_BORDER_RADIUS) { hitProj.add(proj.id); hitMon.add(id); break; }
      }
    }
    if (hitMon.size) {
      // create explosions at monster positions BEFORE deleting
      const nowExplosions: Explosion[] = [];
      for (const id of hitMon) {
        const pos = monsterPositionsRef.current.get(id);
        if (pos) nowExplosions.push({ id: Date.now() + id, position: pos.clone(), age: 0, maxAge: 0.6 });
      }
      if (nowExplosions.length) setExplosions(prev => prev.concat(nowExplosions));
      setMonsters(ms => ms.filter(m => !hitMon.has(m.id)));
      for (const id of hitMon) monsterPositionsRef.current.delete(id);
    }
    if (hitProj.size) {
      setProjectiles(prev => prev.filter(p => !hitProj.has(p.id)));
    }
  });

  return (
    <group>
      <WorldFloor />
      <WordBoard target={target} guesses={guesses} feedback={feedback} current={slots.map(s=>s?.char||'')} position={[0,4,-24]} />
      {letters.map(l => (
        <LetterCube key={l.id} char={l.char} position={l.position} highlight={false} />
      ))}
      {/* Monsters */}
      {monsters.map(m => (
        <Monster
          key={m.id}
          data={m}
          targetRef={playerRef}
          onCatch={()=> { if(!gameWon){ setGameOver(true); setElapsed((performance.now() - startTimeRef.current) / 1000); } }}
          onPositionUpdate={(id,pos)=>{ monsterPositionsRef.current.set(id, pos.clone()); }}
        />
      ))}
  {/* Infinite pickup ring (gold) */}
  {ALPHABET.map((c,i)=>{ const [x,y,z]=ringPos(i); const col = eliminated.has(c) ? '#555555' : '#c9a227'; return <LetterCube key={'ring-'+c} char={c} position={[x,y,z]} color={col} />; })}
      {/* Guess slots */}
      {slotPositions.map((pos,i)=>(
        <group key={i} position={[pos[0],0,pos[2]]}>
          <mesh>
            <cylinderGeometry args={[0.5,0.5,0.25,24]} />
            <meshStandardMaterial color={slots[i] ? '#555555' : '#ffffff'} />
          </mesh>
          {slots[i] && <LetterCube char={slots[i]!.char} position={[0,0.9,0]} />}
        </group>
      ))}
      {/* Lock-in button */}
      <group position={lockInPos}>
        <mesh>
          <boxGeometry args={[1.8,0.3,1.2]} />
          <meshStandardMaterial color={slots.every(s=>s) && guesses.length<6 ? '#1b7fff' : '#555'} />
        </mesh>
      </group>
      {held && <LetterCube char={held.char} position={[0,-100,0]} attachToPlayer />}
      <Player ref={playerRef} onAction={pickOrPlace} onThrow={throwLetter} heldChar={held?.char || null} />
      {projectiles.map(p => (
        <group key={p.id}>
          <mesh position={p.position.toArray()}>
            <boxGeometry args={[0.5,0.5,0.5]} />
            <meshStandardMaterial color={'#ffffff'} emissive={'#88bbff'} emissiveIntensity={1.0} />
          </mesh>
          {p.trail.map((t,i) => {
            const alpha = (i+1)/p.trail.length; // 0..1
            const scale = PROJECTILE_TRAIL_BASE_SCALE + PROJECTILE_TRAIL_SCALE_MULT * alpha; // larger trail
            const fade = alpha; // brightness increases toward head
            return (
              <mesh key={i} position={t.toArray()} scale={[scale,scale,scale]}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial color={'#66b7ff'} transparent opacity={0.18*fade} emissive={'#3399ff'} emissiveIntensity={0.9*fade} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Explosions */}
      {explosions.map(e => {
        const t = e.age / e.maxAge; // 0..1
        const sphereScale = 0.5 + t*2.5;
        const ringScale = 0.8 + t*3.2;
        const fade = 1 - t;
        return (
          <group key={e.id} position={e.position.toArray()}>
            <mesh scale={[sphereScale,sphereScale,sphereScale]}>
              <sphereGeometry args={[0.5, 16,16]} />
              <meshStandardMaterial color={'#ffffff'} emissive={'#ffaa55'} emissiveIntensity={1.2*fade} transparent opacity={0.5*fade} />
            </mesh>
            <mesh rotation={[Math.PI/2,0,0]} scale={[ringScale,ringScale,ringScale]} position={[0,0.01,0]}>
              <torusGeometry args={[0.9,0.08,10,24]} />
              <meshStandardMaterial color={'#ffdd88'} emissive={'#ffbb33'} emissiveIntensity={0.8*fade} transparent opacity={0.4*fade} />
            </mesh>
          </group>
        );
      })}
      {gameOver && !gameWon && (
        <ResultOverlay mode="lose" time={elapsed!==null?formatTime(elapsed):undefined} onRestart={()=>location.reload()} />
      )}
      {gameWon && (
        <ResultOverlay mode="win" time={elapsed!==null?formatTime(elapsed):undefined} targetWord={target.toUpperCase()} onRestart={()=>location.reload()} />
      )}
    </group>
  );
}

function formatTime(sec:number){
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60);
  const ms = Math.floor((sec*1000)%1000);
  return `${m}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
}
