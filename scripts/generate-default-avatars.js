/**
 * Generate 20 pastel, artsy "clipart" default profile avatars as SVGs.
 *
 * These are circulated as default avatars for profiles/credits without a photo
 * (e.g. the HS first-author credits after the HS Foundation rebrand). They are
 * flat pastel scenes (hills, moons, plants, waves, …) — friendly and neutral,
 * no faces.
 *
 *   node scripts/generate-default-avatars.js
 *
 * Writes public/assets/default-avatars/avatar-01.svg … avatar-20.svg.
 * Re-run any time to refresh the set (filenames stay stable, so no code change
 * is needed). Keep COUNT in sync with src/lib/defaultAvatar.js.
 */
const fs = require("fs");
const path = require("path");

// Pastel palettes: { bg, c1, c2, c3, ink }
const PALETTES = [
  { bg: "#FDE2E4", c1: "#FAD2E1", c2: "#F7A8C4", c3: "#FFC8A2", ink: "#8B5E83" }, // blush
  { bg: "#E0F2FE", c1: "#BAE6FD", c2: "#7DD3FC", c3: "#FDE68A", ink: "#3B6E8F" }, // sky
  { bg: "#DCFCE7", c1: "#BBF7D0", c2: "#86EFAC", c3: "#FDE68A", ink: "#3F7A5E" }, // mint
  { bg: "#EDE9FE", c1: "#DDD6FE", c2: "#C4B5FD", c3: "#FBCFE8", ink: "#6D5BA6" }, // lavender
  { bg: "#FFEDD5", c1: "#FED7AA", c2: "#FDBA74", c3: "#BBF7D0", ink: "#B5764A" }, // peach
  { bg: "#FEF9C3", c1: "#FEF08A", c2: "#FACC72", c3: "#A7F3D0", ink: "#94843B" }, // lemon
  { bg: "#FFE4E6", c1: "#FECDD3", c2: "#FDA4AF", c3: "#BAE6FD", ink: "#9F5C66" }, // rose
];

// Each scene returns inner SVG markup drawn over the pastel background.
const SCENES = [
  // 0 — sun over rolling hills
  (p) => `
    <circle cx="138" cy="66" r="30" fill="${p.c2}"/>
    <path d="M0 200 Q55 120 110 158 T200 150 V200 Z" fill="${p.c1}"/>
    <path d="M0 200 Q70 158 140 178 T200 172 V200 Z" fill="${p.c3}"/>`,
  // 1 — mountains with snow caps
  (p) => `
    <polygon points="38,168 92,58 146,168" fill="${p.c1}"/>
    <polygon points="106,168 150,88 196,168" fill="${p.c2}"/>
    <polygon points="78,98 92,58 106,98 92,108" fill="#ffffff"/>
    <polygon points="138,112 150,88 162,112 150,120" fill="#ffffff"/>
    <rect x="0" y="166" width="200" height="34" fill="${p.c3}"/>`,
  // 2 — crescent moon and stars
  (p) => `
    <circle cx="96" cy="104" r="46" fill="${p.c2}"/>
    <circle cx="116" cy="90" r="40" fill="${p.bg}"/>
    <g fill="${p.c3}">
      <circle cx="58" cy="58" r="5"/><circle cx="150" cy="150" r="4"/>
      <circle cx="150" cy="62" r="3.5"/><circle cx="66" cy="140" r="3.5"/>
    </g>`,
  // 3 — layered ocean waves
  (p) => `
    <path d="M0 116 Q50 96 100 116 T200 116 V200 H0 Z" fill="${p.c1}"/>
    <path d="M0 144 Q50 124 100 144 T200 144 V200 H0 Z" fill="${p.c2}"/>
    <path d="M0 172 Q50 156 100 172 T200 172 V200 H0 Z" fill="${p.c3}"/>`,
  // 4 — potted plant
  (p) => `
    <g stroke="${p.c2}" stroke-width="6" fill="none" stroke-linecap="round">
      <path d="M100 150 C100 110 80 96 70 80"/>
      <path d="M100 150 C100 116 122 100 132 84"/>
      <path d="M100 150 V96"/>
    </g>
    <g fill="${p.c1}">
      <ellipse cx="66" cy="76" rx="16" ry="10" transform="rotate(-35 66 76)"/>
      <ellipse cx="136" cy="80" rx="16" ry="10" transform="rotate(35 136 80)"/>
      <ellipse cx="100" cy="90" rx="14" ry="9"/>
    </g>
    <path d="M74 150 H126 L118 192 H82 Z" fill="${p.c3}"/>`,
  // 5 — single flower
  (p) => `
    <rect x="96" y="110" width="8" height="70" rx="4" fill="${p.c2}"/>
    <ellipse cx="118" cy="150" rx="16" ry="9" transform="rotate(25 118 150)" fill="${p.c2}"/>
    <g fill="${p.c1}">
      <circle cx="100" cy="64" r="20"/><circle cx="128" cy="86" r="20"/>
      <circle cx="118" cy="118" r="20"/><circle cx="82" cy="118" r="20"/>
      <circle cx="72" cy="86" r="20"/>
    </g>
    <circle cx="100" cy="92" r="18" fill="${p.c3}"/>`,
  // 6 — clouds in a clear sky
  (p) => `
    <circle cx="138" cy="70" r="22" fill="${p.c3}"/>
    <g fill="${p.c1}">
      <circle cx="74" cy="110" r="24"/><circle cx="104" cy="110" r="30"/>
      <circle cx="134" cy="112" r="22"/><rect x="74" y="110" width="62" height="26" rx="13"/>
    </g>
    <g fill="${p.c2}">
      <circle cx="56" cy="150" r="16"/><circle cx="80" cy="152" r="20"/>
      <rect x="56" y="150" width="40" height="18" rx="9"/>
    </g>`,
  // 7 — rainbow over a little cloud
  (p) => `
    <g fill="none" stroke-width="13" stroke-linecap="round">
      <path d="M36 168 A64 64 0 0 1 164 168" stroke="${p.c1}"/>
      <path d="M54 168 A46 46 0 0 1 146 168" stroke="${p.c2}"/>
      <path d="M72 168 A28 28 0 0 1 128 168" stroke="${p.c3}"/>
    </g>
    <g fill="#ffffff">
      <circle cx="92" cy="170" r="12"/><circle cx="112" cy="170" r="14"/>
      <rect x="92" y="168" width="34" height="14" rx="7"/>
    </g>`,
  // 8 — organic overlapping blobs
  (p) => `
    <path d="M70 50 C110 40 140 64 138 100 C136 134 104 150 76 138 C44 124 38 60 70 50 Z" fill="${p.c1}"/>
    <path d="M118 92 C150 86 166 116 150 142 C132 168 92 162 86 132 C82 108 96 96 118 92 Z" fill="${p.c2}"/>
    <circle cx="74" cy="150" r="20" fill="${p.c3}"/>`,
  // 9 — concentric circles
  (p) => `
    <circle cx="100" cy="100" r="72" fill="${p.c1}"/>
    <circle cx="100" cy="100" r="50" fill="${p.c2}"/>
    <circle cx="100" cy="100" r="28" fill="${p.c3}"/>
    <circle cx="100" cy="100" r="10" fill="${p.ink}"/>`,
  // 10 — leaf
  (p) => `
    <path d="M100 38 C146 62 146 138 100 168 C54 138 54 62 100 38 Z" fill="${p.c1}"/>
    <path d="M100 50 V160" stroke="${p.c2}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g stroke="${p.c2}" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M100 78 L78 92"/><path d="M100 78 L122 92"/>
      <path d="M100 108 L76 124"/><path d="M100 108 L124 124"/>
    </g>`,
  // 11 — hot air balloon
  (p) => `
    <path d="M100 36 C140 36 156 70 156 92 C156 120 128 138 100 138 C72 138 44 120 44 92 C44 70 60 36 100 36 Z" fill="${p.c1}"/>
    <path d="M100 36 C112 36 120 66 120 92 C120 116 112 134 100 138 C88 134 80 116 80 92 C80 66 88 36 100 36 Z" fill="${p.c2}"/>
    <g stroke="${p.ink}" stroke-width="2.5"><path d="M86 134 L92 162"/><path d="M114 134 L108 162"/></g>
    <rect x="88" y="160" width="24" height="18" rx="4" fill="${p.c3}"/>`,
];

// 20 distinct (scene, palette) pairings.
const COMBOS = Array.from({ length: 20 }, (_, i) => ({
  scene: i % SCENES.length,
  palette: (i * 3) % PALETTES.length,
}));

function buildSvg(sceneIdx, paletteIdx) {
  const p = PALETTES[paletteIdx];
  const inner = SCENES[sceneIdx](p).trim();
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Decorative avatar">
  <rect width="200" height="200" fill="${p.bg}"/>
  ${inner}
</svg>
`;
}

const outDir = path.join(__dirname, "..", "public", "assets", "default-avatars");
fs.mkdirSync(outDir, { recursive: true });

COMBOS.forEach((c, i) => {
  const n = String(i + 1).padStart(2, "0");
  fs.writeFileSync(path.join(outDir, `avatar-${n}.svg`), buildSvg(c.scene, c.palette));
});

console.log(`Wrote ${COMBOS.length} avatars to ${outDir}`);
