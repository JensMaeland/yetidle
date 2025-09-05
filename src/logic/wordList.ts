// Utility to load and pick a random target word.
// We import the raw text file (Vite can handle ?raw) and split into lines.
import wordsRaw from '../../allowed_words.txt?raw';

const WORDS = wordsRaw.split(/\r?\n/).filter(w => w.length === 5);

export function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
}

export function isAllowed(word: string): boolean {
  return WORDS.includes(word.toLowerCase());
}
