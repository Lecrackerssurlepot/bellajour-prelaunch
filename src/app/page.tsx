"use client";

import { useEffect, useRef } from "react";

const IMG_W = 120;
const IMG_H = 120;

export default function Home() {
  const imgRef = useRef<HTMLImageElement>(null);
  const pos = useRef({ x: 100, y: 100 });
  const vel = useRef({ x: 2.5, y: 2.2 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      const el = imgRef.current;
      if (!el) return;

      const maxX = window.innerWidth - IMG_W;
      const maxY = window.innerHeight - IMG_H;

      pos.current.x += vel.current.x;
      pos.current.y += vel.current.y;

      if (pos.current.x <= 0) {
        pos.current.x = 0;
        vel.current.x = Math.abs(vel.current.x);
      } else if (pos.current.x >= maxX) {
        pos.current.x = maxX;
        vel.current.x = -Math.abs(vel.current.x);
      }

      if (pos.current.y <= 0) {
        pos.current.y = 0;
        vel.current.y = Math.abs(vel.current.y);
      } else if (pos.current.y >= maxY) {
        pos.current.y = maxY;
        vel.current.y = -Math.abs(vel.current.y);
      }

      el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "var(--color-bg)" }}>
      <img
        ref={imgRef}
        src="/surprise.jpg"
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: IMG_W,
          height: IMG_H,
          objectFit: "cover",
          borderRadius: 8,
          willChange: "transform",
        }}
      />
    </div>
  );
}
