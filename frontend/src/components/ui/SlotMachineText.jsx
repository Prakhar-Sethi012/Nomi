import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useAppMotion } from '../../hooks/useAppMotion';

const REEL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const REEL_SIZE = 5;

const randomGlyph = () => REEL_CHARS[Math.floor(Math.random() * REEL_CHARS.length)];

// Builds the "reel" a single character rides down: a few random glyphs
// followed by the real one, so it reads as spinning to a stop rather than
// just fading in — the same beat as an airport split-flap board.
const buildReel = (finalChar) => {
  const reel = [];
  for (let i = 0; i < REEL_SIZE; i++) reel.push(randomGlyph());
  reel.push(finalChar);
  return reel;
};

// Split-flap style reveal for names: each letter spins through a short reel
// of random glyphs before landing on the real character, staggered left to
// right so the whole word reads as one continuous roll rather than N letters
// animating independently. Falls back to plain text under reduced motion,
// same convention as ScrambleText.
function SlotMachineText({ text, className = '', staggerDelay = 0.045 }) {
  const m = useAppMotion();
  const characters = useMemo(() => (text || '').split(''), [text]);
  const reels = useMemo(
    () => characters.map((c) => (c === ' ' ? null : buildReel(c))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text]
  );

  if (m.reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-flex ${className}`} aria-label={text}>
      <span aria-hidden="true" className="inline-flex">
        {characters.map((char, i) => {
          const reel = reels[i];
          if (!reel) return <span key={i}>&nbsp;</span>;
          return (
            <span key={i} className="inline-block overflow-hidden" style={{ height: '1em', lineHeight: '1em' }}>
              <motion.span
                className="flex flex-col items-start"
                style={{ lineHeight: '1em' }}
                initial={{ y: 0 }}
                animate={{ y: `-${REEL_SIZE}em` }}
                transition={{ duration: 0.55, delay: i * staggerDelay, ease: [0.16, 1, 0.3, 1] }}
              >
                {reel.map((glyph, ri) => (
                  <span key={ri} style={{ height: '1em', lineHeight: '1em' }}>{glyph}</span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export default SlotMachineText;
