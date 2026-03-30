"use client";
import { useRef, useState } from "react";
import "./DraggableCarousel.scss";

export default function DraggableCarousel({ children, className = "" }) {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setScrollLeft(containerRef.current.scrollLeft);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className={`draggable-carousel-wrapper ${className}`}>
            <div className="draggable-carousel-fade draggable-carousel-fade--left" />
            <div
                ref={containerRef}
                className={`draggable-carousel ${isDragging ? "draggable-carousel--grabbing" : ""}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {children}
            </div>
            <div className="draggable-carousel-fade draggable-carousel-fade--right" />
        </div>
    );
}
