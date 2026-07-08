import { useEffect, useRef, useState } from 'react';

const FULL_SCRAPS = [
  { top: '10%', left: '6%', w: 100, h: 130, rot: -12, depth: 0.03, delay: '0s', blur: 1.5 },
  { top: '66%', left: '9%', w: 72, h: 96, rot: 16, depth: 0.06, delay: '-7s', blur: 0 },
  { top: '16%', left: '84%', w: 88, h: 114, rot: 8, depth: 0.02, delay: '-13s', blur: 2 },
  { top: '70%', left: '80%', w: 66, h: 88, rot: -18, depth: 0.05, delay: '-4s', blur: 0.5 },
  { top: '42%', left: '2%', w: 58, h: 76, rot: 6, depth: 0.08, delay: '-10s', blur: 0 },
];

const SUBTLE_SCRAPS = [
  { top: '6%', left: '3%', w: 64, h: 84, rot: -10, depth: 0.03, delay: '0s', blur: 1.5 },
  { top: '82%', left: '90%', w: 56, h: 74, rot: 13, depth: 0.04, delay: '-9s', blur: 1 },
];

export default function AmbientBackground({ variant = 'full' }) {
  const scraps = variant === 'subtle' ? SUBTLE_SCRAPS : FULL_SCRAPS;
  const opacity = variant === 'subtle' ? 0.3 : 0.5;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frame = useRef(null);

  useEffect(() => {
    function handleMove(e) {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setOffset({ x, y });
      });
    }
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <>
      <div className="ambient-vignette" />
      <div className="ambient-stage">
        <div className="ambient-glow" />
        <div className="ambient-glow secondary" />
        {scraps.map((s, i) => (
          <div
            key={i}
            className="ambient-scrap-wrap"
            style={{
              top: s.top,
              left: s.left,
              transform: `translate(${offset.x * s.depth * 100}px, ${offset.y * s.depth * 100}px)`,
              opacity,
            }}
          >
            <div
              className="ambient-scrap"
              style={{
                width: s.w,
                height: s.h,
                '--rot': `${s.rot}deg`,
                animationDelay: s.delay,
                filter: s.blur ? `blur(${s.blur}px)` : 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div className="ambient-noise" />
    </>
  );
}