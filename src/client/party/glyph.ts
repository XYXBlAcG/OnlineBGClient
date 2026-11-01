import type { PartyGlyph } from "../../domain/party/stage";
export function drawPartyGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: PartyGlyph,
  color: string,
  emoji: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  if (glyph === "emoji") {
    ctx.font = '112px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 80, 85);
    return;
  }
  ctx.translate(80, 80);
  ctx.beginPath();
  if (glyph === "star" || glyph === "spark" || glyph === "crystal") {
    const points = glyph === "star" ? 10 : glyph === "crystal" ? 6 : 8;
    for (let i = 0; i < points; i++) {
      const r = glyph === "crystal" ? 60 : i % 2 ? 16 : 65,
        a = (i * Math.PI * 2) / points - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffffaa";
    ctx.stroke();
  } else if (glyph === "bubble" || glyph === "coin") {
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.globalAlpha = glyph === "bubble" ? 0.18 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.strokeStyle = "#fff9";
    ctx.beginPath();
    ctx.arc(0, 0, 40, Math.PI, Math.PI * 1.6);
    ctx.stroke();
  } else if (glyph === "smoke") {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(-70, -70, 140, 140);
  } else if (glyph === "petal") {
    ctx.ellipse(0, 0, 30, 65, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === "card") {
    ctx.roundRect(-40, -60, 80, 120, 12);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-18, -30, 36, 60);
  } else if (glyph === "note") {
    ctx.arc(-20, 35, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-5, -60, 10, 95);
    ctx.fillRect(0, -60, 42, 15);
  } else {
    ctx.moveTo(-35, -60);
    ctx.bezierCurveTo(65, -30, -65, 30, 35, 60);
    ctx.lineWidth = 24;
    ctx.stroke();
  }
}
