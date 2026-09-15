import { drawScene } from "./draw";
import { filmDuration, MAX_FILM_SECONDS, type FilmScene } from "./timeline";

export function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); image.onload = image.onerror = null; };
    const fail = (error: Error) => { cleanup(); image.src = ""; reject(error); };
    const abort = () => fail(new DOMException("Cancelled", "AbortError"));
    const timer = setTimeout(() => fail(new Error("The photo took too long to load. Check your connection and try again.")), 30_000);
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => fail(new Error("This photo could not be loaded. Replace or remove it, then try again."));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    image.src = url;
  });
}

export async function exportSupport(width: number, height: number, music: boolean) {
  if (!window.isSecureContext || !("VideoEncoder" in window)) return false;
  const { canEncodeVideo, canEncodeAudio } = await import("mediabunny");
  return await canEncodeVideo("avc", { width, height }) && (!music || await canEncodeAudio("aac", { numberOfChannels: 2, sampleRate: 48000 }));
}

export async function exportFilm(scenes: FilmScene[], options: {
  width: number; height: number; music: File | null; motion: boolean;
  signal: AbortSignal; onProgress: (fraction: number, message: string) => void;
}): Promise<Blob> {
  const { width, height, signal, onProgress } = options;
  const duration = filmDuration(scenes);
  if (!scenes.length || duration > MAX_FILM_SECONDS) throw new Error("Keep your film under five minutes for browser export.");
  signal.throwIfAborted();
  if (!await exportSupport(width, height, !!options.music || scenes.some(scene => scene.kind === "video"))) throw new Error("MP4 export is unavailable on this device at this size. Try 720p in an up-to-date desktop Chrome or Edge browser.");
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, Input, ALL_FORMATS, UrlSource, CanvasSink, AudioBufferSink } = await import("mediabunny");
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: "avc", bitrate: width * height > 1_000_000 ? 6_000_000 : 3_000_000 });
  output.addVideoTrack(source, { frameRate: 30 });
  let activeInput: InstanceType<typeof Input> | null = null;
  const abort = () => { activeInput?.dispose(); };
  signal.addEventListener("abort", abort);
  let finished = false;
  try {
    const hasAudio = !!options.music || scenes.some(scene => scene.kind === "video");
    const audioSource = hasAudio ? new AudioBufferSource({ codec: "aac", bitrate: 128_000 }) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    const clipAudio: { buffer: AudioBuffer; timestamp: number; trim: number }[] = [];
    let timelineOffset = 0;
    await output.start();
    let frame = 0;
    let videoClipsWithAudio = 0;
    const totalFrames = scenes.reduce((n, s) => n + Math.round(s.duration * 30), 0);
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      signal.throwIfAborted();
      onProgress(frame / totalFrames * 0.95, `Scene ${index + 1} of ${scenes.length}: ${scene.title.slice(0, 60)}`);
      let image: HTMLImageElement | null = null;
      let iterator: AsyncGenerator<import("mediabunny").WrappedCanvas | null, void, unknown> | null = null;
      const frames = Math.round(scene.duration * 30);
      try {
        if (scene.kind === "image" && scene.url) image = await loadImage(scene.url, signal);
        if (scene.kind === "video" && scene.url) {
          activeInput = new Input({ formats: ALL_FORMATS, source: new UrlSource(scene.url, { requestInit: { credentials: "same-origin" }, getRetryDelay: () => null, maxCacheSize: 16 * 1024 * 1024, fetchFn: (url, init) => fetch(url, { ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(30_000), ...(init?.signal ? [init.signal] : [])]) }) }) });
          const track = await activeInput.getPrimaryVideoTrack();
          if (!track || !await track.canDecode()) throw new Error("This video format cannot be decoded on this device. Replace it with a photo or a compatible video, or remove the scene.");
          const first = await track.getFirstTimestamp();
          const end = await track.computeDuration();
          if (first + scene.start >= end) throw new Error("The clip starts after the video ends. Choose an earlier start time.");
          const sink = new CanvasSink(track, { width, height, fit: "contain", poolSize: 2 });
          iterator = sink.canvasesAtTimestamps(Array.from({ length: frames }, (_, f) => Math.min(first + scene.start + f / 30, Math.max(first, end - 0.05))));
        }
        for (let f = 0; f < frames; f++) {
          signal.throwIfAborted();
          const video = iterator ? (await iterator.next()).value : null;
          if (iterator && !video) throw new Error("A video frame could not be decoded. Replace or remove this clip.");
          drawScene(canvas, scene, f / 30, video ? video.canvas : image, options.motion);
          await source.add(frame / 30, 1 / 30);
          frame++;
          if (frame % 15 === 0) {
            onProgress(frame / totalFrames * 0.95, `Rendering scene ${index + 1} of ${scenes.length}…`);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        if (activeInput && scene.kind === "video" && scene.url) {
          const audioTrack = await activeInput.getPrimaryAudioTrack();
          if (audioTrack) {
            if (!await audioTrack.canDecode()) throw new Error("This clip's video can be used, but its audio format cannot be decoded here. Convert the clip to AAC audio or remove it.");
            const videoTrack = await activeInput.getPrimaryVideoTrack();
            if (!videoTrack) throw new Error("This video could not be read for audio.");
            const audioStart = await videoTrack.getFirstTimestamp() + scene.start;
            const audioEnd = Math.min(await activeInput.computeDuration(), audioStart + scene.duration);
            const audioSink = new AudioBufferSink(audioTrack);
            const clipAudioStart = clipAudio.length;
            for await (const sample of audioSink.buffers(audioStart, audioEnd)) {
              signal.throwIfAborted();
              const trim = Math.max(0, audioStart - sample.timestamp);
              const timestamp = timelineOffset + Math.max(0, sample.timestamp - audioStart);
              if (timestamp < timelineOffset + scene.duration && trim < sample.buffer.duration) clipAudio.push({ buffer: sample.buffer, timestamp, trim });
            }
            if (clipAudio.length > clipAudioStart) videoClipsWithAudio++;
          }
        }
      } catch (error) {
        if (signal.aborted) signal.throwIfAborted();
        throw new Error(`Scene ${index + 1} (${scene.title.slice(0, 60)}): ${error instanceof Error ? error.message : "Unable to render media."}`);
      } finally {
        await iterator?.return();
        activeInput?.dispose(); activeInput = null;
        if (image) image.src = "";
      }
      timelineOffset += scene.duration;
    }
    source.close();
    signal.throwIfAborted();
    if (audioSource) {
      onProgress(0.96, options.music ? `Mixing audio from ${videoClipsWithAudio} video clips with your music…` : `Adding audio from ${videoClipsWithAudio} video clips…`);
      const context = new OfflineAudioContext(2, Math.ceil(duration * 48000), 48000);
      const master = context.createDynamicsCompressor();
      master.threshold.value = -8; master.ratio.value = 8; master.attack.value = 0.003; master.release.value = 0.15;
      master.connect(context.destination);
      for (const clip of clipAudio) {
        const node = context.createBufferSource();
        node.buffer = clip.buffer;
        const gain = context.createGain(); gain.gain.value = 0.9;
        node.connect(gain).connect(master);
        node.start(clip.timestamp, clip.trim, Math.min(clip.buffer.duration - clip.trim, duration - clip.timestamp));
      }
      if (options.music) {
        const decoded = await context.decodeAudioData(await options.music.arrayBuffer());
        signal.throwIfAborted();
        const audio = context.createBufferSource(); audio.buffer = decoded;
        const gain = context.createGain();
        const musicEnd = Math.min(duration, decoded.duration);
        const fadeIn = Math.min(0.8, musicEnd / 4);
        const fadeOut = Math.min(1.5, musicEnd / 3);
        gain.gain.setValueAtTime(0, 0);
        gain.gain.linearRampToValueAtTime(0.28, fadeIn);
        gain.gain.setValueAtTime(0.28, Math.max(fadeIn, musicEnd - fadeOut));
        gain.gain.linearRampToValueAtTime(0, musicEnd);
        audio.connect(gain).connect(master);
        audio.start(0, 0, musicEnd);
      }
      const soundtrack = await context.startRendering();
      signal.throwIfAborted();
      await audioSource.add(soundtrack); audioSource.close();
    }
    signal.throwIfAborted();
    onProgress(0.98, "Finishing your film…");
    await output.finalize();
    finished = true;
    signal.throwIfAborted();
    if (!output.target.buffer) throw new Error("The film could not be saved.");
    return new Blob([output.target.buffer], { type: "video/mp4" });
  } finally {
    signal.removeEventListener("abort", abort);
    if (!finished) await output.cancel().catch(() => {});
    canvas.width = canvas.height = 1;
  }
}
