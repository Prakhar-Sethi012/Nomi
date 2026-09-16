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
    <span className={`inline-flex gap-0 ${className}`} aria-label={text}>
      <span aria-hidden="true" className="inline-flex gap-0">
        {characters.map((char, i) => {
          const reel = reels[i];
          if (!reel) {
            // A real space, kept flush with its neighbors (no reel, nothing
            // to animate) so word breaks survive without blowing the layout
            // apart the way an untreated " " inside a flex row can.
            return <span key={i} className="inline-block">&nbsp;</span>;
          }
          return (
            <span key={i} className="relative inline-block overflow-hidden" style={{ height: '1em', lineHeight: '1em' }}>
              {/* Invisible sizer: pins this slot's width to the FINAL
                  character alone. Without it the box auto-sizes to the
                  widest of the ~6 stacked reel glyphs — a random wide
                  letter like "W" sitting behind the real (narrow) "r" — so
                  narrow letters were left with a random leftover gap after
                  them. That's what caused "Pr ak h ar" instead of "Prakhar". */}
              <span style={{ visibility: 'hidden' }}>{char}</span>
              <motion.span
                className="absolute inset-0 flex flex-col items-center"
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
