import { useEffect, useRef, useState } from 'react';
import { useAppMotion } from '../../hooks/useAppMotion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Scrambles through random characters before settling on the new text —
// used for the theme label as it cycles Dark → Light → Cyberpunk. Runs on
// a plain rAF loop (there's no Motion primitive for character-level text),
// but still respects reduced motion via the same useAppMotion() flag
// everything else in the app checks.
function ScrambleText({ text, className = '', duration = 400 }) {
  const m = useAppMotion();
  const [display, setDisplay] = useState(text);
  const frameRef = useRef(null);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (prevTextRef.current === text) return;
    prevTextRef.current = text;

    if (m.reduced) {
      setDisplay(text);
      return;
    }

    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const revealCount = Math.floor(progress * text.length);
      const scrambled = text
        .split('')
        .map((char, i) => (char === ' ' || i < revealCount ? char : CHARS[Math.floor(Math.random() * CHARS.length)]))
        .join('');
      setDisplay(scrambled);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, duration, m.reduced]);

  return <span className={className}>{display}</span>;
}

export default ScrambleText;
