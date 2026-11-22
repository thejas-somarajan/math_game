import type { Controller } from "./controller";
export class Renderer {
  images: Record<string, HTMLImageElement> = {};
  constructor(
    public ctx: CanvasRenderingContext2D,
    public level: number,
    public bossArt = Math.ceil(level / 5),
  ) {
    for (const name of [
      `terrain-${level}`,
      "jets",
      "enemies",
      "pickups",
      `boss-${bossArt}`,
    ]) {
      const im = new Image();
      im.src = `/assets/${name}.png`;
      this.images[name] = im;
    }
  }
  sprite(
    name: string,
    cell: number,
    cols: number,
    rows: number,
    x: number,
    y: number,
    w: number,
    h: number,
    rotation = 0,
  ) {
    const im = this.images[name],
      c = this.ctx;
    if (!im?.complete || !im.naturalWidth) return false;
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    const sw = im.width / cols,
      sh = im.height / rows;
    c.drawImage(
      im,
      (cell % cols) * sw,
      Math.floor(cell / cols) * sh,
      sw,
      sh,
      -w / 2,
      -h / 2,
      w,
      h,
    );
    c.restore();
    return true;
  }
  draw(game: Controller, reduced = false, jet = 0) {
    const c = this.ctx,
      w = game.w;
    c.clearRect(0, 0, 480, 720);
    const im = this.images[`terrain-${this.level}`];
    if (im?.complete && im.naturalWidth) {
      const h = (480 * im.height) / im.width,
        offset = reduced ? 0 : (w.tick * 0.45) % h;
      c.drawImage(im, 0, offset - h, 480, h);
      c.drawImage(im, 0, offset, 480, h);
      c.drawImage(im, 0, offset + h, 480, h);
    } else {
      c.fillStyle = "#14595e";
      c.fillRect(0, 0, 480, 720);
    }
    c.fillStyle = "rgba(5,26,34,.13)";
    c.fillRect(0, 0, 480, 720);
    if (!reduced) {
      c.fillStyle = "rgba(240,255,250,.14)";
      for (let i = 0; i < 4; i++) {
        const y = ((w.tick * 0.7 + i * 210) % 1000) - 120;
        c.beginPath();
        c.ellipse((i * 173) % 480, y, 85, 24, -0.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (const e of w.entities)
      this.sprite(
        "enemies",
        e.kind,
        2,
        2,
        e.x,
        e.y,
        e.kind === 3 ? 115 : 80,
        e.kind === 3 ? 115 : 80,
      );
    for (const p of w.pickups) {
      if (p.kind === 3) {
        c.strokeStyle = "#ffe48d";
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(p.x, p.y, 20, 12, 0, 0, Math.PI * 2);
        c.stroke();
      } else this.sprite("pickups", p.kind, 3, 1, p.x, p.y, 52, 52);
    }
    if (w.bossActive) {
      const x = game.bossX;
      this.sprite(
        `boss-${this.bossArt}`,
        0,
        1,
        1,
        x,
        105,
        170 + (this.level - 1) * 4.3,
        140 + (this.level - 1) * 3.5,
      );
      c.fillStyle = "#132b38";
      c.fillRect(100, 20, 280, 8);
      c.fillStyle = "#f7b878";
      c.fillRect(100, 20, 280 * Math.max(0, w.bossHp / w.bossMaxHp), 8);
      c.font = "bold 11px sans-serif";
      c.fillStyle = "#fff4d6";
      c.textAlign = "center";
      c.fillText(
        `${game.level.bossConfig.name.toUpperCase()} · RANK ${this.level}`,
        240,
        46,
      );
      c.textAlign = "start";
    }
    for (const b of w.bullets) {
      c.fillStyle = "#b7fff5";
      c.fillRect(b.x - 2, b.y - 10, 4, 19);
      c.fillStyle = "#fff7d2";
      c.fillRect(b.x - 1, b.y - 11, 2, 11);
    }
    for (const b of w.enemyBullets) {
      c.fillStyle = b.kind === 2 ? "#ffb4a4" : "#ffe6a2";
      c.beginPath();
      if (b.kind === 2) {
        c.moveTo(b.x, b.y - 7);
        c.lineTo(b.x + 5, b.y);
        c.lineTo(b.x, b.y + 7);
        c.lineTo(b.x - 5, b.y);
        c.closePath();
      } else c.arc(b.x, b.y, 5, 0, 7);
      c.fill();
      c.strokeStyle = "#db664e";
      c.lineWidth = 2;
      c.stroke();
    }
    if (w.invincible === 0 || Math.floor(w.invincible / 16) % 2 === 0) {
      if (!reduced) {
        c.fillStyle = "#71f4df";
        c.beginPath();
        c.moveTo(w.x - 7, w.y + 25);
        c.lineTo(w.x, w.y + 43 + Math.sin(w.tick) * 5);
        c.lineTo(w.x + 7, w.y + 25);
        c.fill();
      }
      this.sprite("jets", jet, 3, 1, w.x, w.y, 112, 84);
    }
    if (w.shield > 0) {
      c.strokeStyle = "#8cebe9";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(w.x, w.y, 42, 0, 7);
      c.stroke();
    }
    for (const e of w.effects) {
      const r = e.age * 1.25 + 5;
      c.globalAlpha = 1 - e.age / 30;
      c.fillStyle = e.kind ? "#ffb568" : "#c6ffed";
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3;
        c.fillRect(e.x + Math.cos(a) * r - 4, e.y + Math.sin(a) * r - 4, 8, 8);
      }
      c.globalAlpha = 1;
    }
    const g = c.createLinearGradient(0, 630, 0, 720);
    g.addColorStop(0, "rgba(7,28,33,0)");
    g.addColorStop(1, "rgba(7,28,33,.65)");
    c.fillStyle = g;
    c.fillRect(0, 630, 480, 90);
  }
}
