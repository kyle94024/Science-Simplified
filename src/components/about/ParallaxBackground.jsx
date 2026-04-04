"use client";

import { useRef, useEffect, useState } from "react";

export default function ParallaxBackground({ imageUrl, alt, speed = 0.3, children, className = "" }) {
  const containerRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) { rafRef.current = null; return; }

        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Only calculate when element is near viewport
        if (rect.bottom > -200 && rect.top < windowHeight + 200) {
          const center = rect.top + rect.height / 2;
          const fromCenter = (windowHeight / 2 - center) * speed;
          setOffset(fromCenter);
        }
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [imageUrl, speed]);

  return (
    <div ref={containerRef} className={`parallax-bg ${className}`}>
      {imageUrl && (
        <div
          className="parallax-bg__image"
          style={{
            backgroundImage: `url(${imageUrl})`,
            transform: `translateY(${offset}px)`,
          }}
          role="img"
          aria-label={alt || ""}
        />
      )}
      <div className="parallax-bg__content">
        {children}
      </div>
    </div>
  );
}
