#!/usr/bin/env node
// Generates every SVG in /assets from one set of design tokens.
// Zero dependencies. Run:  node scripts/build-assets.mjs
// See docs/README-DESIGN.md for the visual system and editing notes.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(OUT, { recursive: true });

// ── Tokens ────────────────────────────────────────────────────────────────
const brand = {
  electric: '#3D7BFF',
  violet: '#8C7BFF',
  iconBlue: '#5B7CFA', // mid-luminance: legible on both GitHub themes
};

const themes = {
  dark: {
    canvasA: '#080B12',
    canvasB: '#0D1322',
    border: '#1C2333',
    grid: '#FFFFFF',
    gridOpacity: 0.045,
    ink: '#EEF1F7',
    muted: '#8A94A7',
    line: '#C9D2E3',
    glowBlue: 0.24,
    glowViolet: 0.16,
    rule: '#30363D',
  },
  light: {
    canvasA: '#FBFBFD',
    canvasB: '#EEF1F7',
    border: '#DCE1EA',
    grid: '#0B0F17',
    gridOpacity: 0.055,
    ink: '#0B0F17',
    muted: '#566074',
    line: '#2A3346',
    glowBlue: 0.13,
    glowViolet: 0.1,
    rule: '#D0D7DE',
  },
};

const SANS =
  "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO =
  "ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace";

// Shared motion. Everything is visible by default; animation only adds
// a one-time draw-in and one slow orbiting node. Reduced motion disables both.
const motionCSS = (period) => `
    .draw { stroke-dasharray: 1; animation: draw 1.8s cubic-bezier(.2,.7,.2,1) both; }
    .d2 { animation-delay: .15s; } .d3 { animation-delay: .3s; }
    .orbiter { offset-rotate: 0deg; animation: orbit ${period}s linear infinite; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes orbit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
    @media (prefers-reduced-motion: reduce) {
      .draw, .orbiter { animation: none; }
      .orbiter { display: none; }
    }`;

const r = (n) => Math.round(n * 100) / 100;

// Point on a rotated ellipse at parameter t (radians).
function ellipsePoint(cx, cy, rx, ry, rotDeg, t) {
  const a = (rotDeg * Math.PI) / 180;
  const x = rx * Math.cos(t);
  const y = ry * Math.sin(t);
  return [r(cx + x * Math.cos(a) - y * Math.sin(a)), r(cy + x * Math.sin(a) + y * Math.cos(a))];
}

// Closed ellipse as a path (for offset-path), starting at t = 0.
function ellipsePath(cx, cy, rx, ry, rotDeg) {
  const [x0, y0] = ellipsePoint(cx, cy, rx, ry, rotDeg, 0);
  const [x1, y1] = ellipsePoint(cx, cy, rx, ry, rotDeg, Math.PI);
  return `M${x0} ${y0} A${rx} ${ry} ${rotDeg} 1 1 ${x1} ${y1} A${rx} ${ry} ${rotDeg} 1 1 ${x0} ${y0}Z`;
}

// ── Wordmark ──────────────────────────────────────────────────────────────
// A bespoke monoline logotype. Strokes run past the cap and baseline and are
// clipped flat, which gives crisp, font-independent terminals.
function wordmark({ x, baseline, cap, stroke: s, tracking, color, accent, id }) {
  const top = baseline - cap;
  const ext = s * 1.5; // overshoot that the clip trims
  const yt = top + s / 2; // centerline of a stroke sitting on the cap line
  const yb = baseline - s / 2; // centerline of a stroke sitting on the baseline

  const stem = (cx) => `M${r(cx)} ${r(top - ext)}V${r(baseline + ext)}`;

  const glyphs = {
    H: (w) => `${stem(s / 2)}${stem(w - s / 2)}M0 ${r(top + cap * 0.5)}H${w}`,
    A: (w) => {
      // Λ form; its crossbar is replaced by a node (drawn separately).
      const k = (w / 2) / cap; // run per unit of rise
      return `M${r(-ext * k)} ${r(baseline + ext)}L${r(w / 2)} ${r(top - 2)}L${r(w + ext * k)} ${r(baseline + ext)}`;
    },
    R: (w) => {
      const bowlBottom = top + cap * 0.54;
      const rad = (bowlBottom - yt) / 2;
      const bx = w - s / 2 - rad;
      return (
        stem(s / 2) +
        `M0 ${r(yt)}H${r(bx)}A${r(rad)} ${r(rad)} 0 0 1 ${r(bx)} ${r(bowlBottom)}H0` +
        `M${r(w * 0.42)} ${r(bowlBottom)}L${r(w + s * 0.3)} ${r(baseline + ext)}`
      );
    },
    I: () => stem(s / 2),
    N: (w) =>
      `${stem(s / 2)}${stem(w - s / 2)}M${r(s * 0.2)} ${r(top - ext * 0.6)}L${r(w - s * 0.2)} ${r(baseline + ext * 0.6)}`,
    D: (w) => {
      const rad = (yb - yt) / 2;
      const bx = w - s / 2 - rad;
      return `${stem(s / 2)}M0 ${r(yt)}H${r(bx)}A${r(rad)} ${r(rad)} 0 0 1 ${r(bx)} ${r(yb)}H0`;
    },
  };
  const widths = { H: cap * 0.7, A: cap * 0.84, R: cap * 0.68, I: s, N: cap * 0.72, D: cap * 0.74 };
  // Optical kerning: the open sides of Λ need less air.
  const kern = { HA: -0.06, AR: -0.05, DA: -0.06 };

  let cursor = x;
  let d = '';
  const nodes = [];
  const letters = 'HARINDA'.split('');
  letters.forEach((ch, i) => {
    const w = widths[ch];
    d += `<path transform="translate(${r(cursor)} 0)" d="${glyphs[ch](w)}"/>`;
    if (ch === 'A') nodes.push([r(cursor + w / 2), r(baseline - cap * 0.3)]);
    const next = letters[i + 1];
    if (next) cursor += w + tracking + (kern[ch + next] || 0) * cap;
    else cursor += w;
  });

  const svg = `
  <clipPath id="${id}-clip"><rect x="${x - 40}" y="${top}" width="${cursor - x + 80}" height="${cap}"/></clipPath>
  <g clip-path="url(#${id}-clip)" fill="none" stroke="${color}" stroke-width="${s}" stroke-linecap="butt" stroke-linejoin="miter">${d}</g>
  <circle cx="${nodes[0][0]}" cy="${nodes[0][1]}" r="${r(s * 0.5)}" fill="${color}"/>
  <circle cx="${nodes[1][0]}" cy="${nodes[1][1]}" r="${r(s * 0.5)}" fill="${accent}"/>`;
  return { svg, width: cursor - x };
}

// ── Orbital motif ─────────────────────────────────────────────────────────
// Three tilted orbits around a precise core: interface, system, product,
// connected by hairlines. One node travels slowly on the middle orbit.
function orbital({ cx, cy, scale = 1, t, labels = true, id, period = 48 }) {
  const rot = -16;
  const orbits = [
    { rx: 220, ry: 78, op: 0.16, dash: '' },
    { rx: 156, ry: 56, op: 0.26, dash: '' },
    { rx: 92, ry: 33, op: 0.38, dash: '2 7' },
  ].map((o) => ({ ...o, rx: o.rx * scale, ry: o.ry * scale }));

  const pts = [
    { o: 0, at: -2.0, label: '01  INTERFACE', dx: 0, dy: -24, anchor: 'middle' },
    { o: 1, at: 1.75, label: '02  SYSTEM', dx: 0, dy: 34, anchor: 'middle' },
    { o: 0, at: -0.5, label: '03  PRODUCT', dx: 0, dy: -24, anchor: 'middle' },
  ].map((p) => {
    const o = orbits[p.o];
    return { ...p, xy: ellipsePoint(cx, cy, o.rx, o.ry, rot, p.at) };
  });

  // Solid rings draw in; the dashed ring keeps its dash pattern and stays static.
  const rings = orbits
    .map((o, i) => {
      const anim = o.dash ? `stroke-dasharray="${o.dash}"` : `class="draw${i ? ' d' + (i + 1) : ''}" pathLength="1"`;
      return `<ellipse ${anim} cx="${cx}" cy="${cy}" rx="${r(o.rx)}" ry="${r(o.ry)}" transform="rotate(${rot} ${cx} ${cy})" stroke="${t.line}" stroke-opacity="${o.op}"/>`;
    })
    .join('\n    ');

  const links = [
    [pts[0].xy, pts[1].xy],
    [pts[1].xy, pts[2].xy],
    [pts[0].xy, [cx, cy]],
    [pts[2].xy, [cx, cy]],
  ]
    .map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)
    .join('');

  const nodeMarks = pts
    .map(
      (p, i) =>
        `<circle cx="${p.xy[0]}" cy="${p.xy[1]}" r="${5 * scale}" fill="${i === 1 ? brand.electric : t.ink}"/>` +
        `<circle cx="${p.xy[0]}" cy="${p.xy[1]}" r="${11 * scale}" fill="none" stroke="${t.line}" stroke-opacity=".35"/>`
    )
    .join('\n    ');

  const text = labels
    ? pts
        .map(
          (p) =>
            `<text x="${r(p.xy[0] + p.dx)}" y="${r(p.xy[1] + p.dy)}" text-anchor="${p.anchor}">${p.label}</text>`
        )
        .join('\n    ')
    : '';

  return `
  <g fill="none" stroke-width="1.25">
    ${rings}
  </g>
  <g stroke="${t.line}" stroke-opacity=".22" stroke-width="1">${links}</g>
  <g>
    <circle cx="${cx}" cy="${cy}" r="${16 * scale}" fill="none" stroke="${t.line}" stroke-opacity=".5"/>
    <circle cx="${cx}" cy="${cy}" r="${4.5 * scale}" fill="${t.ink}"/>
    <path d="M${cx - 28 * scale} ${cy}H${cx - 20 * scale}M${cx + 20 * scale} ${cy}H${cx + 28 * scale}M${cx} ${cy - 28 * scale}V${cy - 20 * scale}M${cx} ${cy + 20 * scale}V${cy + 28 * scale}" stroke="${t.line}" stroke-opacity=".5"/>
    ${nodeMarks}
  </g>
  <circle class="orbiter" r="${4 * scale}" fill="${brand.violet}" style="offset-path: path('${ellipsePath(cx, cy, orbits[1].rx, orbits[1].ry, rot)}');"/>
  ${labels ? `<g font-family="${MONO}" font-size="13" letter-spacing="1.6" fill="${t.muted}">\n    ${text}\n  </g>` : ''}`;
}

// ── Hero ──────────────────────────────────────────────────────────────────
function hero(name) {
  const t = themes[name];
  const W = 1200;
  const H = 560;
  const padX = 80;

  const mark = wordmark({
    x: padX,
    baseline: 332,
    cap: 116,
    stroke: 14,
    tracking: 27,
    color: t.ink,
    accent: brand.electric,
    id: 'wm',
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title desc">
  <title id="title">HARINDA — Full-stack developer and digital product builder</title>
  <desc id="desc">Custom HARINDA wordmark beside an orbital diagram of three connected nodes labelled interface, system and product.</desc>
  <style>${motionCSS(48)}
  </style>
  <defs>
    <linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.canvasA}"/>
      <stop offset="1" stop-color="${t.canvasB}"/>
    </linearGradient>
    <radialGradient id="glowBlue" cx="${(W * 0.8) / W}" cy="${200 / H}" r=".55">
      <stop offset="0" stop-color="${brand.electric}" stop-opacity="${t.glowBlue}"/>
      <stop offset="1" stop-color="${brand.electric}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowViolet" cx=".95" cy=".95" r=".5">
      <stop offset="0" stop-color="${brand.violet}" stop-opacity="${t.glowViolet}"/>
      <stop offset="1" stop-color="${brand.violet}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${t.grid}" stroke-opacity="${t.gridOpacity}" stroke-width="1"/>
    </pattern>
    <radialGradient id="gridFade" cx=".72" cy=".42" r=".62">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#gridFade)"/></mask>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#canvas)"/>
    <rect width="${W}" height="${H}" fill="url(#glowBlue)"/>
    <rect width="${W}" height="${H}" fill="url(#glowViolet)"/>
    <rect width="${W}" height="${H}" fill="url(#grid)" mask="url(#gridMask)"/>
    ${orbital({ cx: 978, cy: 250, scale: 0.78, t, id: 'hero' })}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="27.5" fill="none" stroke="${t.border}"/>

  <!-- Meta row -->
  <g font-family="${MONO}" font-size="14" letter-spacing="2.4" fill="${t.muted}">
    <rect x="${padX}" y="74" width="8" height="8" fill="${brand.electric}"/>
    <text x="${padX + 22}" y="83">IAMHARINDA</text>
    <text x="${W - padX}" y="83" text-anchor="end">SRI LANKA</text>
  </g>

  <!-- Wordmark -->
  ${mark.svg}

  <!-- Headline -->
  <g font-family="${SANS}">
    <text x="${padX - 2}" y="420" font-size="34" font-weight="500" letter-spacing="-.4" fill="${t.ink}">Full-stack developer &amp; digital product builder.</text>
    <text x="${padX - 1}" y="462" font-size="22" letter-spacing="-.1" fill="${t.muted}">Engineering and design, held to the same standard.</text>
  </g>

  <!-- Base row -->
  <path d="M${padX} 500H${W - padX}" stroke="${t.line}" stroke-opacity=".14"/>
  <g font-family="${MONO}" font-size="13" letter-spacing="2" fill="${t.muted}">
    <text x="${padX}" y="528">WEB  ·  FULL-STACK  ·  SAAS  ·  CREATIVE TECHNOLOGY</text>
    <text x="${W - padX}" y="528" text-anchor="end">IAMHARINDA.COM</text>
  </g>
</svg>
`;
}

// ── Footer ────────────────────────────────────────────────────────────────
// The orbital-H monogram between two fading hairlines. Transparent so it
// sits directly on the GitHub page.
function footer(name) {
  const t = themes[name];
  const W = 1200;
  const H = 180;
  const cx = W / 2;
  const cy = 90;
  const rot = -18;
  const orbit = { rx: 54, ry: 17 };
  const node = ellipsePoint(cx, cy, orbit.rx, orbit.ry, rot, -0.5);
  const stemX = 24;

  // Interlock: the orbit's upper (back) arc passes behind both stems.
  // Find those crossings numerically and knock the orbit out around them.
  const gaps = [-stemX, stemX].map((dx) => {
    let best = null;
    for (let i = 0; i < 3600; i++) {
      const [x, y] = ellipsePoint(cx, cy, orbit.rx, orbit.ry, rot, (i / 3600) * 2 * Math.PI);
      if (Math.abs(x - (cx + dx)) < 0.6 && (!best || y < best[1])) best = [x, y];
    }
    return best;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title">
  <title id="title">Harinda monogram — an H whose crossbar is an orbit</title>
  <style>${motionCSS(36)}
  </style>
  <defs>
    <linearGradient id="ruleL" x1="0" x2="1">
      <stop offset="0" stop-color="${t.line}" stop-opacity="0"/>
      <stop offset="1" stop-color="${t.line}" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="ruleR" x1="0" x2="1">
      <stop offset="0" stop-color="${t.line}" stop-opacity=".5"/>
      <stop offset="1" stop-color="${t.line}" stop-opacity="0"/>
    </linearGradient>
    <mask id="interlock" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#fff"/>
      ${gaps.map(([x, y]) => `<rect x="${r(x - 7.5)}" y="${r(y - 8)}" width="15" height="16" fill="#000"/>`).join('')}
    </mask>
  </defs>
  <rect x="120" y="${cy - 0.5}" width="${cx - 84 - 120}" height="1" fill="url(#ruleL)"/>
  <rect x="${cx + 84}" y="${cy - 0.5}" width="${W - 120 - cx - 84}" height="1" fill="url(#ruleR)"/>
  <g fill="none" stroke="${t.ink}" stroke-width="5">
    <path d="M${cx - stemX} ${cy - 34}V${cy + 34}M${cx + stemX} ${cy - 34}V${cy + 34}"/>
  </g>
  <g mask="url(#interlock)">
    <ellipse class="draw" pathLength="1" cx="${cx}" cy="${cy}" rx="${orbit.rx}" ry="${orbit.ry}" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${brand.electric}" stroke-width="2.5"/>
  </g>
  <circle cx="${node[0]}" cy="${node[1]}" r="5" fill="${brand.electric}"/>
  <circle class="orbiter" r="3.5" fill="${brand.violet}" style="offset-path: path('${ellipsePath(cx, cy, orbit.rx, orbit.ry, rot)}');"/>
</svg>
`;
}

// ── Focus-area icons ──────────────────────────────────────────────────────
// 48 grid, 2.5 stroke, square geometry, one violet node per icon.
const icon = (title, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${title}">
  <g fill="none" stroke="${brand.iconBlue}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body.stroke}</g>
  ${body.node}
</svg>
`;
const node = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="${brand.violet}"/>`;

const icons = {
  'icon-web': icon('Modern web experiences', {
    stroke: '<rect x="5" y="9" width="38" height="30" rx="5"/><path d="M5 17H43"/><path d="M13 31l6-6 5 4 8-8"/>',
    node: node(36, 13) ,
  }),
  'icon-fullstack': icon('Full-stack applications', {
    stroke: '<path d="M24 6L42 15L24 24L6 15Z"/><path d="M6 24L24 33L42 24"/><path d="M6 33L24 42L42 33"/>',
    node: node(24, 15),
  }),
  'icon-product': icon('SaaS and digital products', {
    stroke: '<rect x="6" y="6" width="15" height="15" rx="3"/><rect x="27" y="6" width="15" height="15" rx="3"/><rect x="6" y="27" width="15" height="15" rx="3"/><path d="M34.5 28V41M28 34.5H41"/>',
    node: '',
  }),
  'icon-creative': icon('Creative technology', {
    stroke: '<ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-25 24 24)"/><circle cx="24" cy="24" r="5"/>',
    node: node(40.5, 15.5),
  }),
};

// ── Write ─────────────────────────────────────────────────────────────────
// hero.svg / footer.svg are the light defaults (the <img> fallback in README);
// the -dark variants are served by <picture> on GitHub's dark themes.
const files = {
  'hero.svg': hero('light'),
  'hero-dark.svg': hero('dark'),
  'footer.svg': footer('light'),
  'footer-dark.svg': footer('dark'),
  ...Object.fromEntries(Object.entries(icons).map(([k, v]) => [`${k}.svg`, v])),
};

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(OUT, name), svg);
  console.log(`assets/${name}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
