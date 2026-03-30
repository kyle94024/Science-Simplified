"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import "./DraggableCarousel.scss";

export default function DraggableCarousel({ children, className = "", speed = 0.5 }) {
    const containerRef = useRef(null);
    const animRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollStart = useRef(0);
    const lastX = useRef(0);
    const lastTime = useRef(0);
    const velocity = useRef(0);
    const momentumRef = useRef(null);
    const [paused, setPaused] = useState(false);
    const [grabbing, setGrabbing] = useState(false);

    // Auto-scroll loop
    const tick = useCallback(() => {
        const el = containerRef.current;
        if (!el || isDragging.current || paused) {
            animRef.current = requestAnimationFrame(tick);
            return;
        }

        el.scrollLeft += speed;

        // Loop: when we've scrolled past the first set, jump back
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
            el.scrollLeft -= half;
        }

        animRef.current = requestAnimationFrame(tick);
    }, [paused, speed]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [tick]);

    // Momentum decay after drag release
    const startMomentum = useCallback(() => {
        if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
        const decay = () => {
            const el = containerRef.current;
            if (!el || Math.abs(velocity.current) < 0.3) {
                velocity.current = 0;
                return;
            }
            el.scrollLeft -= velocity.current;
            velocity.current *= 0.95; // friction
            // Loop check
            const half = el.scrollWidth / 2;
            if (el.scrollLeft >= half) el.scrollLeft -= half;
            if (el.scrollLeft < 0) el.scrollLeft += half;
            momentumRef.current = requestAnimationFrame(decay);
        };
        momentumRef.current = requestAnimationFrame(decay);
    }, []);

    // Drag handlers
    const handlePointerDown = (e) => {
        if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
        velocity.current = 0;
        isDragging.current = true;
        setGrabbing(true);
        startX.current = e.clientX;
        lastX.current = e.clientX;
        lastTime.current = performance.now();
        scrollStart.current = containerRef.current.scrollLeft;
        containerRef.current.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        const now = performance.now();
        const dt = now - lastTime.current;
        if (dt > 0) {
            velocity.current = (e.clientX - lastX.current) / dt * 16; // normalize to ~1 frame
        }
        lastX.current = e.clientX;
        lastTime.current = now;
        const dx = e.clientX - startX.current;
        containerRef.current.scrollLeft = scrollStart.current - dx;
    };

    const handlePointerUp = (e) => {
        isDragging.current = false;
        setGrabbing(false);
        containerRef.current.releasePointerCapture(e.pointerId);
        startMomentum();
    };

    return (
        <div
            className={`draggable-carousel-wrapper ${className}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="draggable-carousel-fade draggable-carousel-fade--left" />
            <div
                ref={containerRef}
                className={`draggable-carousel ${grabbing ? "draggable-carousel--grabbing" : ""}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Render children twice for seamless loop */}
                {children}
                {children}
            </div>
            <div className="draggable-carousel-fade draggable-carousel-fade--right" />
        </div>
    );
}
