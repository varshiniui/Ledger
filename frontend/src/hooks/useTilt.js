import { useRef } from 'react';

export function useTilt(intensity = 10) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * intensity;
    const rotateX = -((y - centerY) / centerY) * intensity;

    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    el.style.boxShadow = `${-rotateY * 1.5}px ${18 - rotateX}px 40px -20px rgba(28,35,33,0.35)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    el.style.boxShadow = '0 22px 40px -20px rgba(28, 35, 33, 0.35)';
  }

  return { ref, handleMouseMove, handleMouseLeave };
}