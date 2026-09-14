"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "@/state/AppDataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { buildMemories } from "@/state/selectors";
import { Modal } from "@/shared/ui/Modal";
import type { WrappedData } from "../useWrapped";
import { FilmPlayer } from "./FilmPlayer";
import { filmCandidates, filmDuration, makeFilm, MAX_FILM_SECONDS, type FilmScene } from "./timeline";

const button = "rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-40";

function SceneThumbnail({ scene }: { scene: FilmScene }) {
  if (scene.kind === "image" && scene.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={scene.url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />;
  }
  if (scene.kind === "video" && scene.url) {
    return <video muted preload="metadata" src={scene.url} className="h-14 w-20 shrink-0 rounded-lg bg-brand-900 object-cover" aria-label="Video scene thumbnail" />;
  }
  return <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-brand-900 px-2 text-center font-serif text-xs text-brand-50">{scene.title.slice(0, 26)}</div>;
}

function FilmTimeline({ scenes }: { scenes: FilmScene[] }) {
  const total = filmDuration(scenes);
  return <div className="rounded-xl border border-line bg-surface p-3" aria-label="Film timeline">
    <div className="flex h-9 gap-0.5 overflow-hidden rounded-lg bg-ink/5">
      {scenes.map((scene, index) => <div key={scene.id} title={`${index + 1}. ${scene.title}`} className={`min-w-[4px] ${scene.kind === "image" ? "bg-brand-400" : scene.kind === "video" ? "bg-brand-700" : "bg-amber-500"}`} style={{ flexGrow: scene.duration }} />)}
    </div>
    <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-faint"><span>Start</span><span>{scenes.length} scenes</span><span>{Math.ceil(total)} seconds</span></div>
  </div>;
}

export function YearFilm({ year, wrapped }: { year: number; wrapped: WrappedData }) {
  const [open, setOpen] = useState(false);
  const data = useAppData();
  const { user } = useAuth();
  const candidates = useMemo(() => filmCandidates(year, buildMemories(data.memories, data.memoryMedia), data.collections, data.collectionItems, wrapped), [year, data.memories, data.memoryMedia, data.collections, data.collectionItems, wrapped]);
  return <>
    <section className="mx-auto my-4 max-w-2xl rounded-3xl border border-line bg-surface p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">Your year, in motion</div>
      <h2 className="mt-2 font-serif text-2xl">Make your {year} film</h2>
      <p className="mt-2 text-sm text-muted">Photos, little clips and words worth keeping. Make a highlights film, then download it to treasure or share.</p>
      <button className="mt-4 rounded-xl bg-brand-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" disabled={data.status !== "ready" || !candidates.length} onClick={() => setOpen(true)}>Make my year film</button>
      {!candidates.length && <p className="mt-2 text-sm text-muted">Add a memory, quote or pick of the year to get started.</p>}
    </section>
    <Modal open={open} onClose={() => setOpen(false)} label={`${year} year film`}>
      {open && <FilmEditor year={year} candidates={candidates} account={user?.id ?? "guest"} onClose={() => setOpen(false)} />}
    </Modal>
  </>;
}

interface SavedDraft { version: 1; personal: boolean; portrait: boolean; motion: boolean; scenes: { id: string; duration: number; start: number }[] }

function FilmEditor({ year, candidates, account, onClose }: { year: number; candidates: FilmScene[]; account: string; onClose: () => void }) {
  const storageKey = `daily-year-film:v1:${account}:${year}`;
  const [initial] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as SavedDraft | null;
      if (saved?.version === 1 && Array.isArray(saved.scenes)) {
        const available = new Map([...makeFilm(year, candidates, true), ...candidates].map(s => [s.id, s]));
        const used = new Set<string>();
        const scenes = saved.scenes.flatMap(s => {
          const source = available.get(s.id);
          if (!source || used.has(s.id) || (source.personal && !saved.personal)) return [];
          used.add(s.id);
          return [{ ...source, duration: Math.min(10, Math.max(2, Number(s.duration) || 4)), start: Math.max(0, Math.min(86400, Number(s.start) || 0)) }];
        });
        return { scenes, personal: !!saved.personal, portrait: !!saved.portrait, motion: saved.motion !== false };
      }
    } catch { /* A draft is optional; damaged or unavailable storage must not prevent film creation. */ }
    return { scenes: makeFilm(year, candidates), personal: false, portrait: false, motion: !window.matchMedia("(prefers-reduced-motion: reduce)").matches };
  });
  const [scenes, setScenes] = useState(initial.scenes);
  const [personal, setPersonal] = useState(initial.personal);
  const [portrait, setPortrait] = useState(initial.portrait);
  const [motion, setMotion] = useState(initial.motion);
  const [resolution, setResolution] = useState("720");
  const [music, setMusic] = useState<File | null>(null);
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(true);
  const [download, setDownload] = useState<string | null>(null);
  const [support, setSupport] = useState<{ key: string; value: boolean } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const duration = filmDuration(scenes);
  const width = portrait ? Number(resolution) : resolution === "720" ? 1280 : 1920;
  const height = portrait ? resolution === "720" ? 1280 : 1920 : Number(resolution);
  const supportKey = `${width}:${height}:${!!music}`;
  const supported = support?.key === supportKey ? support.value : null;
  const available = candidates.filter(s => !scenes.some(x => x.id === s.id) && (personal || !s.personal));

  useEffect(() => {
    try {
      // Store only references and editing choices, never another copy of private media or captions.
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, personal, portrait, motion, scenes: scenes.map(({ id, duration, start }) => ({ id, duration, start })) } satisfies SavedDraft));
      // Report whether writing to external storage succeeded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true);
    } catch { setSaved(false); }
  }, [storageKey, scenes, personal, portrait, motion]);

  useEffect(() => {
    let active = true;
    import("./export").then(m => m.exportSupport(width, height, !!music)).then(value => { if (active) setSupport({ key: supportKey, value }); }).catch(() => { if (active) setSupport({ key: supportKey, value: false }); });
    return () => { active = false; };
  }, [width, height, music, supportKey]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function update(id: string, patch: Partial<FilmScene>) { setDownload(null); setScenes(list => list.map(s => s.id === id ? { ...s, ...patch } : s)); }
  function move(index: number, direction: number) {
    setDownload(null);
    setScenes(list => { const next = [...list]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  async function render() {
    if (busy) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(""); setDownload(null); setProgress(0); setMessage("Checking your film…");
    try {
      const { exportFilm } = await import("./export");
      const blob = await exportFilm(scenes, { width, height, music, motion, signal: abort.signal, onProgress: (fraction, text) => { if (!abort.signal.aborted) { setProgress(fraction); setMessage(text); } } });
      if (!abort.signal.aborted) { setDownload(URL.createObjectURL(blob)); setProgress(1); setMessage("Your film is ready."); }
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "The film could not be exported.");
      else setMessage("Export cancelled. Your draft is still here.");
    } finally { setBusy(false); controller.current = null; }
  }

  return <div className="m-auto flex max-h-dvh w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-paper shadow-xl" onClick={e => e.stopPropagation()}>
    <header className="flex items-center justify-between border-b border-line px-5 py-4">
      <div><h2 className="font-serif text-2xl">Your {year} film</h2><p className="text-xs text-muted">{scenes.length} scenes · {Math.ceil(duration)} seconds · {saved ? "Draft saved on this device" : "Draft could not be saved on this device"}</p></div>
      <button className={button} onClick={() => { controller.current?.abort(); onClose(); }}>{busy ? "Cancel & close" : "Close"}</button>
    </header>
    <div className="overflow-y-auto p-4 sm:p-6">
      {scenes.length > 0 && !busy && <FilmPlayer key={JSON.stringify(scenes.map(s => [s.id, s.duration, s.start]))} scenes={scenes} portrait={portrait} music={music} motion={motion} />}
      {busy && <div className="rounded-2xl bg-brand-900 p-10 text-center text-white"><p className="font-serif text-2xl">Making your film</p><p className="mt-3 text-sm">Keep this tab open while your film exports.</p><progress aria-label="Film export progress" max={1} value={progress} className="mt-4 w-full" /><p className="mt-2 text-sm" role="status">{message}</p><button className="mt-4 rounded-lg border border-white/40 px-4 py-2" onClick={() => controller.current?.abort()}>Cancel export</button></div>}
      <fieldset disabled={busy} className="mt-5 min-w-0 space-y-4 disabled:opacity-50">
        <legend className="sr-only">Film options and scenes</legend>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label>Format <select aria-label="Format" className="ml-2 rounded-lg border border-line bg-surface p-2" value={portrait ? "portrait" : "landscape"} onChange={e => { setPortrait(e.target.value === "portrait"); setDownload(null); }}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
          <label>Quality <select aria-label="Quality" className="ml-2 rounded-lg border border-line bg-surface p-2" value={resolution} onChange={e => { setResolution(e.target.value); setDownload(null); }}><option value="720">720p</option><option value="1080">1080p</option></select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={motion} onChange={e => { setMotion(e.target.checked); setDownload(null); }} />Gentle photo movement</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={personal} onChange={e => {
            const checked = e.target.checked; setPersonal(checked); setDownload(null);
            setScenes(list => checked ? [...list.filter(s => s.id !== "outro"), ...candidates.filter(s => s.personal).slice(-3), ...list.filter(s => s.id === "outro")] : list.filter(s => !s.personal));
          }} />Include feelings & gratitude</label>
        </div>
        <div className="rounded-xl border border-line p-3 text-sm">
          <label className="block font-medium">Music (optional)<input className="mt-2 block max-w-full text-sm" type="file" accept="audio/*" onChange={e => {
            const file = e.target.files?.[0] ?? null;
            if (file && file.size > 30 * 1024 * 1024) { setError("Choose an audio file smaller than 30 MB."); e.target.value = ""; return; }
            setMusic(file); setDownload(null); setError("");
          }} /></label>
          <p className="mt-2 text-xs text-muted">Choose music you have permission to use. It fades in and out; video clips are muted. Music stays in this tab and needs reselecting when you return.</p>
          {music && <button className="mt-2 underline" onClick={() => { setMusic(null); setDownload(null); }}>Remove music</button>}
        </div>
        <details className="rounded-xl border border-line p-3" open>
          <summary className="cursor-pointer text-sm font-semibold">Edit your scenes</summary>
          <p className="mt-2 text-xs text-muted">Choose the order and clip starting points. Short clips hold their final frame. Long text is fitted to the screen; check the preview before sharing.</p>
          <FilmTimeline scenes={scenes} />
          <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {scenes.map((scene, i) => <li key={scene.id} className="rounded-xl bg-surface p-3">
              <div className="flex items-start gap-3"><SceneThumbnail scene={scene} /><span className="pt-1 text-xs text-muted">{i + 1}</span><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wide text-muted">{scene.kind} · {scene.label}</p><p className="truncate text-sm" title={scene.title}>{scene.title}</p></div><button className={button} aria-label={`Move scene ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className={button} aria-label={`Move scene ${i + 1} down`} disabled={i === scenes.length - 1} onClick={() => move(i, 1)}>↓</button><button className={button} aria-label={`Remove scene ${i + 1}`} onClick={() => { setScenes(list => list.filter(s => s.id !== scene.id)); setDownload(null); }}>×</button></div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs"><label>Seconds <input aria-label={`Scene ${i + 1} duration`} type="number" min={2} max={10} step={1} value={scene.duration} onChange={e => update(scene.id, { duration: Math.min(10, Math.max(2, Number(e.target.value) || 2)) })} className="w-16 rounded border border-line bg-paper p-1" /></label>{scene.kind === "video" && <label>Start at (seconds) <input aria-label={`Scene ${i + 1} clip start`} type="number" min={0} max={86400} step={0.5} value={scene.start} onChange={e => update(scene.id, { start: Math.max(0, Math.min(86400, Number(e.target.value) || 0)) })} className="w-20 rounded border border-line bg-paper p-1" /></label>}</div>
            </li>)}
          </ol>
          <div className="mt-3 flex gap-2"><select aria-label="Memory or quote to add" className="min-w-0 flex-1 rounded-lg border border-line bg-surface p-2 text-sm" value={addId} onChange={e => setAddId(e.target.value)}><option value="">Add a memory or quote…</option>{available.map(s => <option key={s.id} value={s.id}>{s.label} — {s.title.slice(0, 80)}</option>)}</select><button className={button} disabled={!available.some(s => s.id === addId)} onClick={() => { const scene = available.find(s => s.id === addId); if (scene) { setScenes(list => [...list.filter(s => s.id !== "outro"), scene, ...list.filter(s => s.id === "outro")]); setAddId(""); setDownload(null); } }}>Add scene</button></div>
          <button className="mt-3 text-xs text-muted underline" onClick={() => { setScenes(makeFilm(year, candidates, personal)); setDownload(null); }}>Reset to suggested highlights</button>
        </details>
      </fieldset>
      {duration > MAX_FILM_SECONDS && <p className="mt-3 text-sm text-amber-800">Shorten your film to five minutes or less to export.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!busy && <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="rounded-xl bg-brand-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" disabled={!supported || !scenes.length || duration > MAX_FILM_SECONDS} onClick={render}>{supported === null ? "Checking export support…" : "Create MP4"}</button>
        {download && <a href={download} download={`daily-year-film-${year}.mp4`} className="rounded-xl bg-brand-100 px-5 py-3 text-sm font-semibold text-brand-900">Download your film</a>}
        <p className="text-xs text-muted">{supported === false ? "MP4 export is unavailable at this size on this device. Try 720p or desktop Chrome/Edge. You can still preview your film." : "Rendered on your device. Nothing is published or uploaded."}</p>
        {message && !download && <p role="status" className="w-full text-sm text-muted">{message}</p>}
      </div>}
    </div>
  </div>;
}
