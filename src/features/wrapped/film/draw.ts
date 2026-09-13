import type { FilmScene } from "./timeline";

// Both the player and encoder call this renderer with an explicit scene time.
export function drawScene(canvas: HTMLCanvasElement, scene: FilmScene, time: number, media?: CanvasImageSource | null, motion = true) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a film canvas.");
  const w = canvas.width, h = canvas.height;
  const unit = Math.min(w, h);
  ctx.fillStyle = "#172e27";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = Math.min(1, time / 0.35, Math.max(0, (scene.duration - time) / 0.35));
  if (media) {
    const source = media as HTMLVideoElement & HTMLImageElement;
    const sw = source.videoWidth || source.naturalWidth || Number(source.width);
    const sh = source.videoHeight || source.naturalHeight || Number(source.height);
    const scale = Math.min(w / sw, h / sh) * (scene.kind === "image" && motion ? 1 + 0.045 * time / scene.duration : 1);
    ctx.drawImage(media, (w - sw * scale) / 2, (h - sh * scale) / 2, sw * scale, sh * scale);
    const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
    shade.addColorStop(0, "transparent");
    shade.addColorStop(1, "rgba(8,20,15,.88)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c2d4b9";
  const labelSize = unit * 0.025;
  ctx.font = `500 ${labelSize}px sans-serif`;
  ctx.fillText(scene.label.toLocaleUpperCase(), w / 2, media ? h * 0.79 : h * 0.24, w * 0.82);
  ctx.fillStyle = "#faf9f5";
  let size = unit * (media ? 0.044 : 0.072);
  const maxLines = media ? 3 : 7;
  let lines: string[] = [];
  // Shrink longer cards, then ellipsize deliberately rather than clipping outside the frame.
  for (; size >= unit * 0.024; size -= 2) {
    ctx.font = `${size}px Georgia, serif`;
    lines = wrap(ctx, scene.title, w * 0.8);
    if (lines.length <= maxLines) break;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,3}$/, "…");
  }
  const lineHeight = size * 1.28;
  const center = media ? h * 0.88 : h * 0.5;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, center + (i - (lines.length - 1) / 2) * lineHeight));
  if (!media) {
    ctx.fillStyle = "#728e76";
    ctx.fillRect(w / 2 - unit * 0.03, h * 0.79, unit * 0.06, 2);
  }
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(`${line} ${word}`).width > width) { lines.push(line); line = ""; }
    // Handle URLs and words wider than the frame too.
    for (const character of (line ? " " : "") + word) {
      if (ctx.measureText(line + character).width > width) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}
