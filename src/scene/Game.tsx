import React, { useState, useCallback, useRef } from 'react';
// Using drei Html for reliable overlay within the canvas
import { Html } from '@react-three/drei';
import { ResultOverlay } from './ResultOverlay';
import { Vector3 } from 'three';
import { LetterCube } from './LetterCube';
import { Player } from './Player';
import { WorldFloor } from './WorldFloor';
import { WordBoard } from './WordBoard';
import { randomWord } from '../logic/wordList';
import { Monster, MonsterData } from './Monster';

export type HeldLetter = { char: string } | null;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function Game() {
  const [held, setHeld] = useState<HeldLetter>(null);
  const playerRef = useRef<{ position: Vector3 } | null>(null);
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
  const slotPositions: [number,number,number][] = [-2,-1,0,1,2].map(x=>[x*1.2,0,-20]);
  const [slots,setSlots] = useState<Array<{id:number;char:string}|null>>([null,null,null,null,null]);
  const lockInPos: [number,number,number] = [0,0.5,-22];

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
    // spawn monster only if not winning guess
    const count = guesses.length + 1; // new count after adding
    const speed = 1.5 + count * 0.7; // escalate speed
    const angle = Math.random()*Math.PI*2;
    const spawnRadius = 15; // spawn radius
    const px = playerRef.current?.position.x || 0;
    const pz = playerRef.current?.position.z || 0;
    const mx = px + Math.cos(angle)*spawnRadius;
    const mz = pz + Math.sin(angle)*spawnRadius;
    const monsterPalette = ['#ff4444','#ff8844','#ffcc44','#ffee55','#ffffff'];
    const color = monsterPalette[Math.min(monsterPalette.length-1, count-1)];
    setMonsters(ms => [...ms, { id: Date.now(), speed, position:[mx,0.5,mz], color }]);
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
      // place into nearest empty slot
      let best=-1; let bestDist=0.9;
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
      // pick from slot
      let slotPick=-1; let spd=0.8;
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
  }, [held, letters, slots, guesses, target, gameOver]);

  return (
    <group>
      <WorldFloor />
      <WordBoard target={target} guesses={guesses} feedback={feedback} current={slots.map(s=>s?.char||'')} position={[0,4,-24]} />
      {letters.map(l => (
        <LetterCube key={l.id} char={l.char} position={l.position} highlight={false} />
      ))}
      {/* Monsters */}
      {monsters.map(m => (
        <Monster key={m.id} data={m} targetRef={playerRef} onCatch={()=> { if(!gameWon){ setGameOver(true); setElapsed((performance.now() - startTimeRef.current) / 1000); } }} />
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
      <Player ref={playerRef} onAction={pickOrPlace} heldChar={held?.char || null} />
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
