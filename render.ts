// render.ts — draws "The World on Tuesday", a 1024x1024 newspaper front page
// summing up Tuesday 24 November 2026, with Node's standard library only.
// Everything is deterministic: fixed palette, fixed layout, no time, no random.
// A tiny 5x7 bitmap font renders all text; a small PNG encoder writes the bytes.

import { deflateSync } from "node:zlib";

export const W = 1024;
export const H = 1024;

// ---- palette: warm newsprint, ink black, one red, one green, one blue ----
const PAPER: [number, number, number] = [247, 242, 231];
const PANEL: [number, number, number] = [255, 253, 246];
const INK: [number, number, number] = [17, 17, 17];
const GREY: [number, number, number] = [92, 88, 80];
const RED: [number, number, number] = [176, 30, 30];
const GREEN: [number, number, number] = [14, 122, 61];
const GREEN_LT: [number, number, number] = [46, 160, 96];
const GREEN_DK: [number, number, number] = [9, 84, 42];
const BLUE: [number, number, number] = [29, 78, 137];
const GOLD: [number, number, number] = [176, 124, 22];
const ORANGE: [number, number, number] = [214, 106, 24];
const LIGHT_GREY: [number, number, number] = [203, 197, 186];

type RGB = [number, number, number];

// ---- 5x7 bitmap font: each glyph is 7 rows of 5 bits ("1" = ink) ----
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "=": ["00000", "00000", "01110", "00000", "01110", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "•": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

// ---- pixel buffer ----
const buf = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, t, h, c);
}

function rect(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  hline(x, y, w, t, c);
  hline(x, y + h - t, w, t, c);
  vline(x, y, h, t, c);
  vline(x + w - t, y, h, t, c);
}

// Bresenham line, thickness t (square brush).
function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r * r) px(xx, yy, c);
    }
  }
}

// ---- text ----
function textWidth(text: string, scale: number): number {
  const t = text.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  const t = text.toUpperCase();
  let cx = x;
  for (const ch of t) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r][col] === "1") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

function drawRight(text: string, right: number, y: number, scale: number, c: RGB): void {
  drawText(text, right - textWidth(text, scale), y, scale, c);
}

// Draw lines of text, one under the other. Returns the y after the last line.
function drawLines(lines: string[], x: number, y: number, scale: number, c: RGB, gap = 2): number {
  let yy = y;
  for (const ln of lines) {
    drawText(ln, x, yy, scale, c);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ---- PNG encoder (8-bit RGB, no filtering) ----
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- layout: "The World on Tuesday" ----
// Margins: content runs x 36..988. A double rule frames the whole page.

function drawMasthead(): void {
  rect(14, 14, 996, 996, 3, INK);
  rect(22, 22, 980, 980, 1, INK);
  drawCentered("THE WORLD ON TUESDAY", 512, 40, 7, INK);
  hline(36, 104, 952, 3, INK);
  drawText("TUESDAY, 24 NOVEMBER 2026", 36, 116, 2, INK);
  drawRight("SIX STORIES FROM AROUND THE WORLD", 988, 116, 2, GREY);
  hline(36, 140, 952, 1, LIGHT_GREY);
}

// Hero: Nvidia — Huang returns as CEO, shares +31%.
function drawHero(): void {
  const x = 36;
  const y = 152;
  const w = 952;
  const h = 296;
  fillRect(x, y, w, h, PANEL);
  rect(x, y, w, h, 2, INK);
  // green top bar
  fillRect(x, y, w, 8, GREEN);
  drawText("NVIDIA  •  MARKETS  •  SILICON VALLEY", x + 20, y + 24, 2, RED);
  drawText("HUANG IS BACK", x + 20, y + 52, 8, INK);
  drawText("BOARD RESTORES FOUNDER AS CEO", x + 20, y + 122, 3, INK);
  drawLines(
    [
      "SHARES JUMP 31% IN A DAY, THE BEST SINCE",
      "2003, ADDING $952 BILLION IN VALUE.",
      "NASDAQ +6.5%  •  S&P 500 +4.7% AS AI",
      "FEARS FADE AND CHIPS LEAD THE RALLY.",
    ],
    x + 20,
    y + 164,
    2,
    INK,
    3,
  );
  // rising-bars chart on the right
  const cx0 = 700;
  const base = y + 252;
  hline(cx0 - 8, base, 268, 2, INK);
  vline(cx0 - 8, y + 60, base - (y + 60), 2, INK);
  const bars: Array<[number, number, RGB]> = [
    [0, 42, GREEN_LT],
    [1, 72, GREEN_LT],
    [2, 104, GREEN],
    [3, 142, GREEN],
    [4, 184, GREEN_DK],
  ];
  for (const [i, bh, c] of bars) {
    fillRect(cx0 + i * 52, base - bh, 34, bh, c);
  }
  line(cx0 - 2, base - 30, cx0 + 236, y + 74, 4, GREEN_DK);
  // arrowhead
  line(cx0 + 236, y + 74, cx0 + 214, y + 76, 4, GREEN_DK);
  line(cx0 + 236, y + 74, cx0 + 232, y + 96, 4, GREEN_DK);
  drawText("+31%", cx0 + 8, y + 66, 5, GREEN_DK);
  drawText("BEST DAY SINCE 2003", cx0 + 8, y + 262, 2, GREEN_DK);
}

// One of the three middle columns: kicker, headline, deck, small icon.
function drawColumn(
  x: number,
  y: number,
  w: number,
  kicker: string,
  kickerColor: RGB,
  headline: string[],
  deck: string[],
  icon: "flame" | "building" | "crowd",
): void {
  drawText(kicker, x, y, 2, kickerColor);
  hline(x, y + 20, w, 2, kickerColor);
  let yy = drawLines(headline, x, y + 32, 3, INK, 2);
  yy += 6;
  drawLines(deck, x, yy, 2, INK, 3);
  const iy = y + 226;
  if (icon === "flame") {
    // flame: stacked shrinking blocks, red core, grey smoke dots
    fillRect(x + 10, iy + 20, 40, 14, ORANGE);
    fillRect(x + 16, iy + 6, 28, 14, ORANGE);
    fillRect(x + 22, iy - 6, 16, 12, ORANGE);
    fillRect(x + 24, iy + 12, 12, 22, RED);
    disc(x + 18, iy - 12, 2, GREY);
    disc(x + 34, iy - 18, 2, GREY);
    disc(x + 46, iy - 12, 2, GREY);
  } else if (icon === "building") {
    // apartment block, cracked
    fillRect(x + 6, iy + 2, 48, 32, LIGHT_GREY);
    rect(x + 6, iy + 2, 48, 32, 2, INK);
    fillRect(x + 14, iy + 8, 8, 8, BLUE);
    fillRect(x + 34, iy + 8, 8, 8, BLUE);
    fillRect(x + 14, iy + 22, 8, 8, INK);
    fillRect(x + 34, iy + 22, 8, 8, BLUE);
    line(x + 30, iy + 2, x + 24, iy + 18, 2, RED);
    line(x + 24, iy + 18, x + 32, iy + 34, 2, RED);
  } else {
    // crowd: heads in a row under one placard
    fillRect(x + 8, iy - 6, 44, 14, PANEL);
    rect(x + 8, iy - 6, 44, 14, 2, INK);
    line(x + 30, iy + 8, x + 30, iy + 16, 2, INK);
    for (let i = 0; i < 5; i++) {
      disc(x + 10 + i * 11, iy + 24, 5, BLUE);
      fillRect(x + 5 + i * 11, iy + 30, 10, 6, BLUE);
    }
  }
}

function drawMiddleRow(): void {
  const y = 476;
  const colW = 301;
  const xs = [36, 361, 686];
  drawColumn(
    xs[0],
    y,
    colW,
    "INDONESIA  •  DISASTER",
    RED,
    ["24 DEAD IN", "BANTEN FACTORY", "FIRE"],
    [
      "CANDY PLANT BLAZE IN",
      "CIKANDE, SERANG, KILLS",
      "24; ABOUT 30 STILL",
      "MISSING AS SEARCH",
      "GOES ON. FAULTY AC",
      "UNIT BLAMED.",
    ],
    "flame",
  );
  drawColumn(
    xs[1],
    y,
    colW,
    "UKRAINE  •  WAR",
    BLUE,
    ["DRONE SMASHES", "KYIV FLAT,", "10+ DEAD"],
    [
      "RUSSIAN DRONE HITS A",
      "FIVE-STOREY BLOCK IN",
      "DYMER; 14 MISSING.",
      "KYIV CENTRE HIT",
      "AGAIN ON MONDAY.",
    ],
    "building",
  );
  drawColumn(
    xs[2],
    y,
    colW,
    "PORTUGAL  •  PROTEST",
    GOLD,
    ["THOUSANDS", "MARCH IN", "LISBON"],
    [
      "COST-OF-LIVING RALLY",
      "DEMANDS HIGHER PAY",
      "AND CHEAPER HOMES;",
      "MORE PROTESTS DUE",
      "AT PARLIAMENT TODAY.",
    ],
    "crowd",
  );
  vline(348, y, 252, 1, LIGHT_GREY);
  vline(673, y, 252, 1, LIGHT_GREY);
}

// Bottom row: two wider stories with an icon at the right of each.
function drawBottomRow(): void {
  const y = 756;
  // Iran
  drawText("IRAN  •  MISSILES", 36, y, 2, RED);
  hline(36, y + 20, 464, 2, RED);
  drawLines(["IRAN: ALL OF EUROPE", "NOW IN RANGE"], 36, y + 32, 3, INK, 2);
  drawLines(
    [
      "TEHRAN LAWMAKERS SAY RANGE",
      "ROSE FROM 2,000 KM TO 4,500 KM,",
      "PUTTING US BASES IN EUROPE",
      "AT RISK. CAPABILITY NOT",
      "YET VERIFIED.",
    ],
    36,
    y + 96,
    2,
    INK,
    3,
  );
  // missile arc icon
  line(420, y + 116, 452, y + 62, 3, RED);
  line(452, y + 62, 436, y + 66, 3, RED);
  line(452, y + 62, 448, y + 80, 3, RED);
  disc(420, y + 116, 4, RED);
  drawText("4,500 KM", 392, y + 40, 2, RED);
  // Sparta II
  drawText("BALTIC SEA  •  SHIPPING", 524, y, 2, BLUE);
  hline(524, y + 20, 464, 2, BLUE);
  drawLines(["SPARTA II TOWED", "HOME TO RUSSIA"], 524, y + 32, 3, INK, 2);
  drawLines(
    [
      "RUSSIAN CARGO SHIP HIT",
      "BY DRONE IN THE BALTIC;",
      "REACHES ST PETERSBURG",
      "UNDER TOW. 16 CREW SAFE.",
      "3 NATIONS FOUGHT THE FIRE.",
    ],
    524,
    y + 96,
    2,
    INK,
    3,
  );
  // ship icon: hull + containers + tow line
  fillRect(872, y + 96, 96, 18, BLUE);
  line(872, y + 96, 884, y + 114, 3, BLUE);
  line(968, y + 96, 956, y + 114, 3, BLUE);
  fillRect(884, y + 76, 18, 20, GOLD);
  fillRect(904, y + 76, 18, 20, RED);
  fillRect(924, y + 82, 26, 14, PANEL);
  rect(924, y + 82, 26, 14, 2, INK);
  line(872, y + 105, 840, y + 96, 2, INK);
  vline(512, y, 176, 1, LIGHT_GREY);
}

function drawFooter(): void {
  hline(36, 952, 952, 2, INK);
  drawCentered(
    "SOURCES: REUTERS  •  CNN  •  NY POST  •  IRAN INTERNATIONAL  •  ANEWZ  •  JETSS",
    512,
    966,
    2,
    GREY,
  );
}

export function renderPNG(): Buffer {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawHero();
  hline(36, 462, 952, 1, LIGHT_GREY);
  drawMiddleRow();
  hline(36, 742, 952, 1, LIGHT_GREY);
  drawBottomRow();
  drawFooter();
  return encodePNG();
}
