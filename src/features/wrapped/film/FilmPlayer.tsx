"use client";

import { useEffect, useRef, useState } from "react";
import { drawScene } from "./draw";
import { loadImage } from "./export";
import { filmDuration, sceneAt, type FilmScene } from "./timeline";

export function FilmPlayer({ scenes, portrait, music, motion }: { scenes: FilmScene[]; portrait: boolean; music: File | null; motion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const soundtrack = useRef<HTMLAudioElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [decodedFrame, setDecodedFrame] = useState(0);
  // Backing-store size follows the on-screen size × pixel ratio (capped at
  // 1920) — a fixed 640px canvas stretched to a Retina desktop was blurry.
  const [res, setRes] = useState(640);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const update = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssLong = portrait ? el.clientHeight : el.clientWidth;
      const next = Math.max(640, Math.min(1920, Math.round(cssLong * dpr / 64) * 64));
      setRes((cur) => (cur === next ? cur : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [portrait]);
  const total = filmDuration(scenes);
  const running = playing && time < total;
  const current = sceneAt(scenes, time);
  const scene = current?.scene;

  useEffect(() => {
    if (!music) return;
    const url = URL.createObjectURL(music);
    const audio = new Audio(url);
    audio.volume = 0.8;
    soundtrack.current = audio;
    return () => { audio.pause(); audio.removeAttribute("src"); audio.load(); soundtrack.current = null; URL.revokeObjectURL(url); };
  }, [music]);

  useEffect(() => {
    if (!scene) return;
    const controller = new AbortController();
    // Readiness follows the external media resource loaded for this scene.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false); setError(""); media.current = null;
    if (scene.kind === "card" || !scene.url) { setReady(true); return; }
    if (scene.kind === "image") {
      loadImage(scene.url, controller.signal).then(image => { if (!controller.signal.aborted) { media.current = image; setReady(true); } }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setPlaying(false); } });
      return () => { controller.abort(); if (media.current instanceof HTMLImageElement) media.current.src = ""; media.current = null; };
    }
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "auto"; video.crossOrigin = "anonymous";
    media.current = video;
    const timer = setTimeout(() => { setError("This clip is taking too long to load. Check your connection, or remove it from the film."); setPlaying(false); }, 30_000);
    video.onloadeddata = () => {
      clearTimeout(timer);
      if (scene.start >= video.duration) { setError("This clip starts after the video ends. Choose an earlier start time."); setPlaying(false); return; }
      video.currentTime = scene.start;
      setReady(true);
    };
    video.onerror = () => { clearTimeout(timer); setError("This browser cannot play this clip. Replace it with a photo or remove the scene."); setPlaying(false); };
    video.onseeked = () => setDecodedFrame(n => n + 1);
    video.src = scene.url;
    return () => { clearTimeout(timer); video.pause(); video.onloadeddata = video.onerror = video.onseeked = null; video.removeAttribute("src"); video.load(); media.current = null; controller.abort(); };
  }, [scene]);

  useEffect(() => {
    const video = media.current instanceof HTMLVideoElement ? media.current : null;
    if (running && ready) void video?.play().catch(() => { setPlaying(false); setError("Playback could not start. Try pressing Play again."); });
    else video?.pause();
    const audio = soundtrack.current;
    if (running && ready && audio) void audio.play().catch(() => { setPlaying(false); setError("Your music could not play. Choose another audio file or remove the music."); });
    else audio?.pause();
  }, [running, ready, music]);

  useEffect(() => {
    if (!running || !ready) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1); previous = now;
      setTime(t => Math.min(total, t + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, ready, total]);

  useEffect(() => {
    if (!scene || !canvas.current) return;
    const local = sceneAt(scenes, time)?.local ?? 0;
    const asset = media.current;
    if (asset instanceof HTMLVideoElement && ready && !asset.seeking) {
      const target = Math.min(scene.start + local, Math.max(0, asset.duration - 0.05));
      if (Math.abs(asset.currentTime - target) > 0.25) asset.currentTime = target;
    }
    drawScene(canvas.current, scene, time === 0 && !running ? 0.35 : local, ready ? asset : null, motion);
    const audio = soundtrack.current;
    if (audio && Number.isFinite(audio.duration)) {
      if (Math.abs(audio.currentTime - time) > 0.4) audio.currentTime = Math.min(time, audio.duration);
      audio.volume = 0.8 * Math.max(0, Math.min(1, time, (Math.min(total, audio.duration) - time) / 2));
    }
  }, [time, ready, scene, scenes, total, portrait, motion, decodedFrame, running, res]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  return <div ref={container} className="rounded-2xl bg-[#172e27] p-3 text-white">
    <canvas ref={canvas} width={portrait ? Math.round(res * 9 / 16) : res} height={portrait ? res : Math.round(res * 9 / 16)} aria-label={scene ? `${scene.label}: ${scene.title}` : "Year film preview"} className={`mx-auto max-h-[55dvh] max-w-full ${portrait ? "aspect-[9/16]" : "aspect-video w-full"}`} />
    {!ready && !error && <p className="py-2 text-center text-sm" role="status">Loading scene…</p>}
    {error && <p className="py-2 text-sm text-amber-200" role="alert">{error}</p>}
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button type="button" className="rounded-lg border border-white/30 px-3 py-2" disabled={!ready || !!error} onClick={() => { if (time >= total) { setTime(0); setPlaying(true); } else setPlaying(v => !v); }}>{running ? "Pause" : time >= total ? "Replay" : "Play"}</button>
      <input aria-label="Film playback position" type="range" min={0} max={total} step={0.1} value={time} onChange={e => setTime(Number(e.target.value))} className="min-w-0 flex-1" />
      <span className="tabular-nums">{Math.floor(time)} / {Math.ceil(total)}s</span>
      <button type="button" className="rounded-lg border border-white/30 px-2 py-2" onClick={() => { const result = container.current?.requestFullscreen?.(); void result?.catch(() => setError("Fullscreen is unavailable here. You can still watch in this player.")); }}>Fullscreen</button>
    </div>
  </div>;
}
