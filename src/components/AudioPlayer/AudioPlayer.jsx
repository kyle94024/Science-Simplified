"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Headphones } from "lucide-react";
import "./AudioPlayer.scss";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ audioUrl, title }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x
  const [isLoaded, setIsLoaded] = useState(false);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIndex);
    audio.playbackRate = SPEEDS[nextIndex];
  }, [speedIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) return null;

  return (
    <div
      className="audio-player"
      role="region"
      aria-label={`Audio player for article: ${title}`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="audio-player__header">
        <Headphones size={18} className="audio-player__icon" />
        <span className="audio-player__label">Listen to this article</span>
      </div>

      <div className="audio-player__controls">
        <button
          onClick={togglePlay}
          className="audio-player__play-btn"
          aria-label={isPlaying ? "Pause article audio" : "Play article audio"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div className="audio-player__progress-group">
          <span className="audio-player__time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="audio-player__progress"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            style={{ "--progress": `${progress}%` }}
          />
          <span className="audio-player__time">{formatTime(duration)}</span>
        </div>

        <button
          onClick={cycleSpeed}
          className="audio-player__speed-btn"
          aria-label={`Playback speed: ${SPEEDS[speedIndex]}x`}
        >
          {SPEEDS[speedIndex]}x
        </button>
      </div>
    </div>
  );
}
