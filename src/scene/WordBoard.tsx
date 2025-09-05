import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';

interface WordBoardProps {
  target: string;
  guesses?: string[];
  feedback?: ("blue"|"yellow"|"gray")[][];
  current?: string[]; // building guess
  position?: [number,number,number];
}

// A large flat board that displays placeholder squares for 6 guesses (like Wordle)
// We'll just render empty boxes for now and the target word hidden (debug optional)
export const WordBoard: React.FC<WordBoardProps> = ({ target, guesses=[], feedback=[], current=[], position=[0,0, -6] }) => {
  const rows = 6;
  const cols = 5;
  const cellSize = 1.15; // larger cells
  const gap = 0.18; // slightly larger gap to breathe
  const totalWidth = cols * cellSize + (cols -1)*gap;
  const totalHeight = rows * cellSize + (rows -1)*gap;

  const cells = useMemo(()=>{
    const arr: JSX.Element[] = [];
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const x = -totalWidth/2 + c*(cellSize+gap) + cellSize/2;
        const y = totalHeight/2 - r*(cellSize+gap) - cellSize/2;
        let letter = '';
        let color = '#3b4a5a'; // lighter base
        if (r < guesses.length) {
          letter = guesses[r][c] || '';
          const fb = feedback[r]?.[c];
          if (fb === 'blue') color = '#5aa9ff';
          else if (fb === 'yellow') color = '#ffd84d';
          else if (fb === 'gray') color = '#6a7682';
        } else if (r === guesses.length) {
          letter = current[c] || '';
        }
        arr.push(
          <group key={`${r}-${c}`} position={[x,y,0.05]}>
            <mesh>
              <boxGeometry args={[cellSize, cellSize, 0.08]} />
              <meshStandardMaterial color={color} roughness={1} />
            </mesh>
            {letter && <Text position={[0,0,0.06]} fontSize={0.64} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#000000">{letter}</Text>}
          </group>
        );
      }
    }
    return arr;
  },[guesses, feedback, current]);

  return (
    <group position={position}>
      {/* Board Backing */}
      <mesh position={[0,0,-0.05]}>
        <boxGeometry args={[totalWidth+1.4, totalHeight+1.4, 0.1]} />
        <meshStandardMaterial color="#4a5561" />
      </mesh>
      {cells}
      {/* Debug target word (comment out for production) */}
  <Text position={[0, (totalHeight/2)+1.5, 0]} fontSize={0.7} color="#b0b8c2" anchorX="center" anchorY="middle">
        {target.toUpperCase()}
      </Text>
    </group>
  );
};
