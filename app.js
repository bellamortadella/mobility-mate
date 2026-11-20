/* Mobility Mate — app logic */

const SWITCH_SECS = 5;   // pause to swap sides on one-sided moves
const READY_SECS = 5;    // countdown before the first move
const DEFAULT_DUR = 30;
const DURATIONS = [30, 60]; // the per-move time options
const snapDur = (d) => (d > 45 ? 60 : 30);
const DEFAULT_REST = 10; // fixed 10s transition between moves (no longer editable in the builder)

const $app = document.getElementById("app");
const $sheet = document.getElementById("sheet-root");
const exById = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/* ================= Icons ================= */
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5.2v13.6a1 1 0 0 1-1.55.83L7 13.2V18a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v4.8l9.45-6.43A1 1 0 0 1 18 5.2z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5.2v13.6a1 1 0 0 0 1.55.83L17 13.2V18a1 1 0 0 0 2 0V6a1 1 0 0 0-2 0v4.8L7.55 4.37A1 1 0 0 0 6 5.2z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
};

/* ================= Stick figure ================= */
const JOINTS = ["head", "neck", "mid", "hip", "eA", "hA", "eB", "hB", "kA", "fA", "kB", "fB"];
const SVGNS = "http://www.w3.org/2000/svg";
const liveFigures = new Set();

function lerpPose(a, b, t, arc = false) {
  const out = {};
  for (const k of JOINTS) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  if (arc) for (const [e, h] of [["eA", "hA"], ["eB", "hB"]]) {
    // Swing each arm segment by angle (not straight-line), so arms keep their length mid-swing.
    const seg = (from, to, p) => [p[to][0] - from[0], p[to][1] - from[1]];
    const turn = (va, vb) => {
      const la = Math.hypot(...va), lb = Math.hypot(...vb);
      let aa = Math.atan2(va[1], va[0]), ab = Math.atan2(vb[1], vb[0]);
      let d = ab - aa;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest way round
      const ang = aa + d * t, len = la + (lb - la) * t;
      return [Math.cos(ang) * len, Math.sin(ang) * len];
    };
    const up = turn(seg(a.neck, e, a), seg(b.neck, e, b));
    out[e] = [out.neck[0] + up[0], out.neck[1] + up[1]];
    const fore = turn(seg(a[e], h, a), seg(b[e], h, b));
    out[h] = [out[e][0] + fore[0], out[e][1] + fore[1]];
  }
  return out;
}
// Figure settings that come from an exercise.
const exOpts = (ex) => ({ front: ex.front, pass: ex.pass, stepMs: ex.stepMs, arc: ex.arcArms, prop: ex.prop });

// Simple furniture drawn faintly behind the figure: [x, y, width, height, corner radius].
const PROPS = {
  "couch-front": [[40, 96, 160, 34, 8], [40, 128, 160, 16, 4]],
  "couch-side": [[40, 128, 72, 22, 6], [40, 70, 18, 80, 6]],
  "couch-arm": [[10, 120, 100, 28, 6], [100, 112, 26, 60, 8]],
};
const ease = (x) => (1 - Math.cos(Math.PI * x)) / 2;
const HOLD = 0.3; // share of each step spent holding the pose before moving on

class Figure {
  // `period` = time for one full cycle of a 2-pose move; longer sequences get the same time per step.
  // `pass` = indexes of poses the figure flows through without pausing.
  // `stepMs` = fixed time per step (for fast moves like arm circles); `arc` = swing arms by angle.
  constructor(poses, { animate = true, period = 3600, stroke = 9, accent = false, flip = false, ground = true, front = false, pass = [], stepMs, arc = false, prop } = {}) {
    this.setPath(poses, pass);
    this.animate = animate;
    this.baseStep = period / 2;
    this.step = stepMs || this.baseStep;
    this.arc = arc;
    this.offset = Math.random() * period * 2;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 240 200");
    svg.setAttribute("class", "fig");
    const g = document.createElementNS(SVGNS, "g");
    if (flip) g.setAttribute("transform", "translate(240 0) scale(-1 1)");
    svg.appendChild(g);
    const ink = accent ? "var(--accent)" : "var(--ink)";
    const mk = (tag, attrs) => {
      const el = document.createElementNS(SVGNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      g.appendChild(el);
      return el;
    };
    const line = { fill: "none", stroke: ink, "stroke-width": stroke, "stroke-linecap": "round", "stroke-linejoin": "round" };
    this.propG = mk("g", { fill: "var(--line)" });
    this.setProp(prop);
    if (ground) mk("line", { x1: 30, x2: 210, y1: 188, y2: 188, stroke: "var(--line)", "stroke-width": 4, "stroke-linecap": "round" });
    const far = front ? 1 : 0.35;
    this.armB = mk("path", { ...line, opacity: far });
    this.legB = mk("path", { ...line, opacity: far });
    this.spine = mk("path", line);
    this.legA = mk("path", line);
    this.armA = mk("path", line);
    this.headEl = mk("circle", { r: 13, fill: ink });
    this.svg = svg;
    this.draw(poses[0]);
    if (animate && poses.length > 1) liveFigures.add(this);
  }
  // Group the pose list into moves: each move starts at a pose we pause on and
  // flows through any pass-through poses until the next pause pose.
  setPath(poses, pass = []) {
    this.poses = poses;
    const n = poses.length;
    let holds = poses.map((_, i) => i).filter((i) => !pass.includes(i));
    if (!holds.length) holds = [0];
    let start = 0;
    this.moves = holds.map((h, j) => {
      const next = holds[(j + 1) % holds.length];
      const path = [h];
      let i = h;
      do { i = (i + 1) % n; path.push(i); } while (i !== next);
      const move = { path, start, segs: path.length - 1 };
      start += move.segs;
      return move;
    });
    this.totalSegs = start;
  }
  setProp(name) {
    this.propG.replaceChildren(...(PROPS[name] || []).map(([x, y, width, height, rx]) => {
      const r = document.createElementNS(SVGNS, "rect");
      for (const [k, v] of Object.entries({ x, y, width, height, rx })) r.setAttribute(k, v);
      return r;
    }));
  }
  setPoses(poses, { front, pass, stepMs, arc, prop } = {}) {
    this.setPath(poses, pass);
    this.setProp(prop);
    this.step = stepMs || this.baseStep;
    this.arc = !!arc;
    const far = front ? 1 : 0.35;
    this.armB.setAttribute("opacity", far);
    this.legB.setAttribute("opacity", far);
    this.draw(poses[0]);
  }
  draw(p) {
    const P = (k) => `${p[k][0].toFixed(1)} ${p[k][1].toFixed(1)}`;
    // Quadratic curve through neck → mid → hip (control point chosen so the curve passes through mid)
    const cx = 2 * p.mid[0] - (p.neck[0] + p.hip[0]) / 2;
    const cy = 2 * p.mid[1] - (p.neck[1] + p.hip[1]) / 2;
    this.spine.setAttribute("d", `M${P("neck")} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${P("hip")} M${P("head")} L${P("neck")}`);
    this.armA.setAttribute("d", `M${P("neck")} L${P("eA")} L${P("hA")}`);
    this.armB.setAttribute("d", `M${P("neck")} L${P("eB")} L${P("hB")}`);
    this.legA.setAttribute("d", `M${P("hip")} L${P("kA")} L${P("fA")}`);
    this.legB.setAttribute("d", `M${P("hip")} L${P("kB")} L${P("fB")}`);
    this.headEl.setAttribute("cx", p.head[0]);
    this.headEl.setAttribute("cy", p.head[1]);
  }
  tick(now) {
    const t = ((now + this.offset) % (this.step * this.totalSegs)) / this.step;
    const mv = this.moves.find((m) => t < m.start + m.segs) || this.moves[0];
    const local = t - mv.start;
    const P = this.poses;
    if (local < HOLD) return this.draw(P[mv.path[0]]);
    // One smooth ease across the whole move, so pass-through poses don't cause a pause.
    const u = ease((local - HOLD) / (mv.segs - HOLD)) * mv.segs;
    const s = Math.min(Math.floor(u), mv.segs - 1);
    this.draw(lerpPose(P[mv.path[s]], P[mv.path[s + 1]], u - s, this.arc));
  }
}

function mountFigure(container, poses, opts) {
  const f = new Figure(poses, opts);
  container.replaceChildren(f.svg);
  return f;
}

(function animLoop(now) {
  for (const f of liveFigures) {
    if (!f.svg.isConnected) { liveFigures.delete(f); continue; }
    f.tick(now);
  }
  requestAnimationFrame(animLoop);
})(performance.now());

/* ================= Storage ================= */
const STORE_KEY = "mobilitymate.flows.v1";
const uid = () => Math.random().toString(36).slice(2, 9);

function seedFlows() {
  return [{
    id: uid(), name: "Morning Flow", rest: DEFAULT_REST,
    items: [
      { exId: "body-bounces", dur: 30 },
      { exId: "neck-circles", dur: 30 },
      { exId: "body-waves", dur: 30 },
      { exId: "vertical-arm-swings", dur: 30 },
      { exId: "dead-arm-swings", dur: 30 },
      { exId: "horse-stance", dur: 30 },
      { exId: "down-up-dogs", dur: 30 },
      { exId: "deep-squat-reach", dur: 30 },
      { exId: "deep-squat-knee-taps", dur: 30 },
      { exId: "straddle", dur: 30 },
      { exId: "ninety-ninety", dur: 30 },
      { exId: "crab-pose", dur: 30 },
      { exId: "cossack", dur: 30 },
    ],
  }];
}
function loadFlows() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      // Drop moves that no longer exist; drop flows left empty by that.
      const saved = JSON.parse(raw)
        .map((f) => ({ ...f, items: f.items.filter((i) => exById[i.exId]).map((i) => ({ ...i, dur: snapDur(i.dur) })) }))
        .filter((f) => f.items.length);
      if (saved.length) return saved;
    }
  } catch (e) { /* storage unavailable */ }
  return seedFlows();
}
let flows = loadFlows();
function saveFlows() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(flows)); } catch (e) { /* ignore */ }
}

/* ================= Helpers ================= */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function fmt(secs) {
  secs = Math.max(0, Math.ceil(secs));
  const m = Math.floor(secs / 60), s = secs % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}
function fmtLong(secs) {
  const m = Math.round(secs / 60);
  return m < 1 ? `${Math.round(secs)} sec` : `${m} min`;
}
function flowSeconds(flow) {
  if (!flow.items.length) return 0;
  let t = READY_SECS;
  flow.items.forEach((it, i) => {
    const ex = exById[it.exId];
    t += ex.sided ? it.dur * 2 + SWITCH_SECS : it.dur;
    if (i < flow.items.length - 1) t += flow.rest;
  });
  return t;
}
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

/* ================= Tap sound ================= */
// A sharp, tactile click like a mechanical switch. No pitch sweep (that sounds like a laser):
//   1. a few milliseconds of band-passed noise for the crisp "snap",
//   2. a tiny fixed-pitch tick that dies in ~12ms for definition,
//   3. a faint low thump for weight.
// No audio files. iPhone's silent switch mutes it.
let actx = null, snapNoise = null;
function tapSound(pitch = 1) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime, out = actx.destination;
    if (!snapNoise) {
      const len = Math.floor(actx.sampleRate * 0.006);
      snapNoise = actx.createBuffer(1, len, actx.sampleRate);
      const d = snapNoise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    }
    // 1. snap
    const n = actx.createBufferSource(), bp = actx.createBiquadFilter(), ng = actx.createGain();
    n.buffer = snapNoise;
    bp.type = "bandpass"; bp.frequency.value = 3800 * pitch; bp.Q.value = 0.9;
    ng.gain.value = 0.9;
    n.connect(bp).connect(ng).connect(out);
    n.start(t);
    // 2. tick
    const o = actx.createOscillator(), og = actx.createGain();
    o.type = "triangle"; o.frequency.value = 1800 * pitch;
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
    o.connect(og).connect(out);
    o.start(t); o.stop(t + 0.015);
    // 3. thump
    const th = actx.createOscillator(), tg = actx.createGain();
    th.type = "sine"; th.frequency.value = 150 * pitch;
    tg.gain.setValueAtTime(0.22, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    th.connect(tg).connect(out);
    th.start(t); th.stop(t + 0.03);
  } catch (e) { /* no audio, no problem */ }
}
// Every button clicks on press. Big action buttons get a slightly deeper click.
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  tapSound(b.matches(".btn-primary, .big, .play-chip") ? 0.75 : 1);
}, { passive: true });
function show(html) {
  $app.innerHTML = html;
  $app.classList.remove("screen-in");
  void $app.offsetWidth;
  $app.classList.add("screen-in");
  window.scrollTo(0, 0);
}

/* ================= Home ================= */
function renderHome() {
  stopPlayer();
  const cards = flows.map((f) => {
    const dots = f.items.map((it) => {
      const ex = exById[it.exId];
      const w = Math.max(10, Math.round((ex.sided ? it.dur * 2 : it.dur) / 4));
      return `<span style="width:${w}px"></span>`;
    }).join("");
    return `
      <div class="flow-card" data-play="${f.id}" role="button" tabindex="0">
        <div class="info">
          <h3>${esc(f.name || "Untitled flow")}</h3>
          <div class="meta">${f.items.length} move${f.items.length === 1 ? "" : "s"} · ${fmtLong(flowSeconds(f))}</div>
          <div class="dots">${dots}</div>
        </div>
        <button class="edit-chip" data-edit="${f.id}">Edit</button>
        <span class="play-chip">${ICON.play}</span>
      </div>`;
  }).join("");

  show(`
    <div class="hello">
      <div class="hero-fig" id="hero"></div>
      <h1>Mobility<br><em>Mate</em></h1>
      <p>Pick a flow. Move well.</p>
    </div>
    <div class="flows">${cards || `<div class="empty">No flows yet. Build your first one.</div>`}</div>
    <button class="btn btn-ghost new-flow" id="new">+ New flow</button>
  `);

  mountFigure(document.getElementById("hero"), LOGO, { stroke: 11, ground: false, period: 3000 });
  document.getElementById("new").onclick = () => renderBuilder(null);
  $app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); renderBuilder(b.dataset.edit); });
  $app.querySelectorAll("[data-play]").forEach((c) => c.onclick = () => {
    const f = flows.find((x) => x.id === c.dataset.play);
    if (f.items.length) startPlayer(f); else renderBuilder(f.id);
  });
}

/* ================= Builder ================= */
let draft = null;

function renderBuilder(flowId) {
  const existing = flows.find((f) => f.id === flowId);
  draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: uid(), name: "", rest: DEFAULT_REST, items: [], isNew: true };
  drawBuilder();
}

// A two-option pill toggle (30s / 60s). `attr` tags each button; `value` is the active one.
// Two-option toggle with a sliding thumb (black on 30s, orange on 60s).
function segToggle(attr, value) {
  const i = DURATIONS.indexOf(value);
  return `<div class="seg" data-pos="${i}" data-val="${value ?? ""}"><span class="knob"></span>${DURATIONS.map((d) =>
    `<button ${attr} data-v="${d}" class="${d === value ? "on" : ""}" aria-pressed="${d === value}">${d}s</button>`).join("")}</div>`;
}

function drawBuilder() {
  const items = draft.items.map((it, i) => {
    const ex = exById[it.exId];
    return `
      <div class="item">
        <div class="thumb" data-thumb="${i}"></div>
        <div>
          <div class="name">${esc(ex.name)}</div>
          ${ex.sided ? `<div class="sub">Left + right</div>` : ""}
        </div>
        <div class="controls">
          <div class="tools">
            <button data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">${ICON.up}</button>
            <button data-down="${i}" ${i === draft.items.length - 1 ? "disabled" : ""} aria-label="Move down">${ICON.down}</button>
            <button data-del="${i}" aria-label="Remove">${ICON.trash}</button>
          </div>
          ${segToggle(`data-dur="${i}"`, it.dur)}
        </div>
      </div>`;
  }).join("");

  show(`
    <div class="topbar">
      <button class="icon-btn" id="back" aria-label="Back">${ICON.back}</button>
      <span class="muted">${draft.isNew ? "New flow" : "Edit flow"}</span>
      <span style="width:44px"></span>
    </div>
    <input class="title-input" id="title" placeholder="Name your flow" value="${esc(draft.name)}" maxlength="40" />
    ${draft.items.length > 1 ? `<div class="row-setting">
      <label>Set all moves</label>
      ${segToggle("data-all", draft.items.every((it) => it.dur === draft.items[0].dur) ? draft.items[0].dur : null)}
    </div>` : ""}
    <div class="items">${items}</div>
    <button class="btn btn-ghost add-btn" id="add">+ Add exercise</button>
    <div class="builder-foot">
      <div class="total">${draft.items.length ? `Total ≈ ${fmtLong(flowSeconds(draft))}` : "Add a few moves to get going"}</div>
      <button class="btn btn-primary" id="save" ${draft.items.length ? "" : "disabled style='opacity:.4'"}>Save flow</button>
      ${draft.isNew ? "" : `<button class="danger" id="delete">Delete flow</button>`}
    </div>
  `);

  $app.querySelectorAll("[data-thumb]").forEach((el) => {
    const ex = exById[draft.items[+el.dataset.thumb].exId];
    mountFigure(el, [ex.poses[1]], { animate: false, stroke: 12, ground: false, front: ex.front, prop: ex.prop });
  });

  const title = document.getElementById("title");
  title.oninput = () => (draft.name = title.value);
  if (draft.isNew && !draft.name) title.focus();

  document.getElementById("back").onclick = renderHome;
  document.getElementById("add").onclick = openLibrary;
  // Slide the thumb in place first, then redraw once the glide has finished.
  const slide = (seg, v) => {
    seg.dataset.pos = DURATIONS.indexOf(v);
    seg.dataset.val = v ?? "";
    seg.querySelectorAll("button").forEach((x) => x.classList.toggle("on", +x.dataset.v === v));
  };
  // Update the "set all" toggle and the total in place (a full redraw would replay the fade-in).
  const later = () => {
    const first = draft.items[0]?.dur;
    const same = draft.items.every((it) => it.dur === first);
    const all = $app.querySelector("[data-all]")?.parentElement;
    if (all) slide(all, same ? first : null);
    const total = $app.querySelector(".builder-foot .total");
    if (total && draft.items.length) total.textContent = `Total ≈ ${fmtLong(flowSeconds(draft))}`;
  };
  $app.querySelectorAll("[data-dur]").forEach((b) => b.onclick = () => {
    const v = +b.dataset.v;
    draft.items[+b.dataset.dur].dur = v;
    slide(b.parentElement, v);
    later();
  });
  $app.querySelectorAll("[data-all]").forEach((b) => b.onclick = () => {
    const v = +b.dataset.v;
    draft.items.forEach((it) => (it.dur = v));
    $app.querySelectorAll(".seg").forEach((seg) => slide(seg, v));
    later();
  });
  const swap = (i, j) => { [draft.items[i], draft.items[j]] = [draft.items[j], draft.items[i]]; drawBuilder(); };
  $app.querySelectorAll("[data-up]").forEach((b) => b.onclick = () => swap(+b.dataset.up, +b.dataset.up - 1));
  $app.querySelectorAll("[data-down]").forEach((b) => b.onclick = () => swap(+b.dataset.down, +b.dataset.down + 1));
  $app.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { draft.items.splice(+b.dataset.del, 1); drawBuilder(); });

  document.getElementById("save").onclick = () => {
    if (!draft.items.length) return;
    const { isNew, ...clean } = draft;
    clean.name = clean.name.trim() || "My flow";
    const idx = flows.findIndex((f) => f.id === clean.id);
    if (idx >= 0) flows[idx] = clean; else flows.push(clean);
    saveFlows();
    renderHome();
  };
  const del = document.getElementById("delete");
  if (del) del.onclick = () => {
    if (!confirm(`Delete "${draft.name || "this flow"}"?`)) return;
    flows = flows.filter((f) => f.id !== draft.id);
    saveFlows();
    renderHome();
  };
}

// Library filters: two groups that stack. Within a group, picks widen (Upper or Lower);
// across groups they narrow (Upper AND Floor). Nothing picked in a group = no limit.
// The second chip in each group (Lower, Floor) turns orange when on, for contrast.
const LIB_FILTERS = [[["u", "Upper"], ["l", "Lower"]], [["s", "Standing"], ["f", "Floor"]]];
const libPicked = new Set();

function openLibrary() {
  const chips = LIB_FILTERS.map((grp) => `<div class="chip-group">${grp.map(([k, label], j) =>
    `<button class="chip${j ? " alt" : ""}" data-group="${k}">${label}</button>`).join("")}</div>`).join(`<span class="chip-div"></span>`);
  const cards = EXERCISES.map((ex) => `
    <button class="lib-card" data-add="${ex.id}" data-groups="${ex.groups.join(" ")}">
      <div class="lib-fig" data-libfig="${ex.id}"></div>
      <div class="name">${esc(ex.name)}</div>
      ${ex.sided ? `<span class="tag">L + R</span>` : ""}
      <span class="count"></span>
    </button>`).join("");
  $sheet.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <div class="sheet">
      <div class="grab"></div>
      <div class="sheet-head"><h2>Add a move</h2><span class="sel-total" id="sel-total"></span></div>
      <div class="chips">${chips}</div>
      <p class="lib-empty" id="lib-empty" hidden>No moves match these filters.</p>
      <div class="lib">${cards}</div>
      <button class="btn btn-ink" id="done-add" style="width:100%;margin-top:16px">Done</button>
    </div>`;
  $sheet.querySelectorAll("[data-libfig]").forEach((el) => mountFigure(el, exById[el.dataset.libfig].poses, { stroke: 10, ...exOpts(exById[el.dataset.libfig]) }));
  const close = () => { $sheet.innerHTML = ""; drawBuilder(); };
  document.getElementById("scrim").onclick = close;
  document.getElementById("done-add").onclick = close;
  // Orange outline + position in the flow on picked moves, and a running total.
  const refresh = () => {
    $sheet.querySelectorAll("[data-add]").forEach((b) => {
      const pos = draft.items.findIndex((it) => it.exId === b.dataset.add);
      b.classList.toggle("selected", pos >= 0);
      b.querySelector(".count").textContent = pos >= 0 ? pos + 1 : "";
    });
    const total = draft.items.length;
    document.getElementById("sel-total").textContent = total ? `${total} selected` : "";
    document.getElementById("done-add").textContent = total ? `Done · ${total} ${total === 1 ? "move" : "moves"}` : "Done";
  };
  // Group filter chips.
  const filter = () => {
    $sheet.querySelectorAll("[data-group]").forEach((c) => c.classList.toggle("on", libPicked.has(c.dataset.group)));
    let shown = 0;
    $sheet.querySelectorAll("[data-add]").forEach((b) => {
      const g = b.dataset.groups.split(" ");
      b.hidden = !LIB_FILTERS.every((grp) => {
        const picks = grp.map(([k]) => k).filter((k) => libPicked.has(k));
        return !picks.length || picks.some((k) => g.includes(k));
      });
      if (!b.hidden) shown++;
    });
    document.getElementById("lib-empty").hidden = shown > 0;
  };
  $sheet.querySelectorAll("[data-group]").forEach((c) => c.onclick = () => {
    const k = c.dataset.group;
    libPicked.has(k) ? libPicked.delete(k) : libPicked.add(k);
    filter();
  });
  filter();
  // Tap to pick, tap again to unpick.
  $sheet.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => {
    const id = b.dataset.add;
    if (draft.items.some((it) => it.exId === id)) draft.items = draft.items.filter((it) => it.exId !== id);
    else draft.items.push({ exId: id, dur: DEFAULT_DUR });
    refresh();
    const c = b.querySelector(".count");
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    vibrate(10);
  });
  refresh();
}

/* ================= Player ================= */
let player = null;
let wakeLock = null;

function buildSteps(flow) {
  const steps = [];
  const n = flow.items.length;
  flow.items.forEach((it, i) => {
    const ex = exById[it.exId];
    if (i === 0) steps.push({ type: "ready", dur: READY_SECS, ex, side: ex.sided ? "Left" : null, idx: i });
    if (ex.sided) {
      steps.push({ type: "work", dur: it.dur, ex, side: "Left", idx: i });
      steps.push({ type: "switch", dur: SWITCH_SECS, ex, side: "Right", idx: i });
      steps.push({ type: "work", dur: it.dur, ex, side: "Right", idx: i });
    } else {
      steps.push({ type: "work", dur: it.dur, ex, side: null, idx: i });
    }
    if (i < n - 1 && flow.rest > 0) {
      const nx = exById[flow.items[i + 1].exId];
      steps.push({ type: "rest", dur: flow.rest, ex: nx, side: nx.sided ? "Left" : null, idx: i + 1 });
    }
  });
  return steps;
}

async function requestWake() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
document.addEventListener("visibilitychange", () => { if (player && document.visibilityState === "visible") requestWake(); });

function startPlayer(flow) {
  stopPlayer();
  player = {
    flow, steps: buildSteps(flow), i: 0,
    elapsed: 0, last: performance.now(), paused: false, lastShown: null, raf: 0,
  };
  requestWake();
  drawPlayerShell();
  enterStep();
  player.raf = requestAnimationFrame(playerLoop);
}

function stopPlayer() {
  if (player) cancelAnimationFrame(player.raf);
  player = null;
  releaseWake();
}

function drawPlayerShell() {
  const segs = player.flow.items.map(() => "<span><i></i></span>").join("");
  show(`
    <div class="player">
      <div class="topbar">
        <button class="icon-btn" id="quit" aria-label="End flow">${ICON.close}</button>
        <div class="progress" id="progress">${segs}</div>
        <div class="counter" id="counter"></div>
      </div>
      <div class="stage">
        <div class="phase" id="phase"></div>
        <div class="ring-wrap">
          <svg class="ring" viewBox="0 0 100 100">
            <circle class="ring-track" cx="50" cy="50" r="46" />
            <circle class="ring-bar" id="ringbar" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" />
          </svg>
          <div class="ring-fig" id="ringfig"></div>
        </div>
        <div class="time" id="time"></div>
        <div class="ex-name" id="exname"></div>
        <div id="side"></div>
        <div class="cue" id="cue"></div>
      </div>
      <div class="transport">
        <button class="icon-btn" id="prev" aria-label="Previous">${ICON.prev}</button>
        <button class="big" id="pp" aria-label="Pause">${ICON.pause}</button>
        <button class="icon-btn" id="next" aria-label="Next">${ICON.next}</button>
      </div>
    </div>
  `);
  player.fig = mountFigure(document.getElementById("ringfig"), player.steps[0].ex.poses, { stroke: 9, period: 3600, ...exOpts(player.steps[0].ex) });
  document.getElementById("quit").onclick = () => { if (confirm("End this flow?")) renderHome(); };
  document.getElementById("pp").onclick = togglePause;
  document.getElementById("next").onclick = () => goStep(player.i + 1);
  document.getElementById("prev").onclick = () => goStep(player.elapsed > 2 || player.i === 0 ? player.i : player.i - 1);
}

function enterStep() {
  const s = player.steps[player.i];
  player.elapsed = 0;
  player.lastShown = null;
  const labels = { ready: "Get ready", work: "Move", switch: "Switch sides", rest: "Rest · up next" };
  const phase = document.getElementById("phase");
  phase.textContent = labels[s.type];
  phase.className = "phase" + (s.type === "work" ? "" : " rest");
  document.getElementById("ringbar").classList.toggle("rest", s.type !== "work");
  document.getElementById("exname").textContent = s.ex.name;
  document.getElementById("side").innerHTML = s.side ? `<span class="side-pill">${s.side.toUpperCase()}</span>` : "";
  document.getElementById("cue").textContent = s.type === "work" ? s.ex.cue : s.type === "switch" ? "Swap to the other side." : s.ex.cue;
  document.getElementById("counter").textContent = `${s.idx + 1}/${player.flow.items.length}`;
  player.fig.setPoses(s.ex.poses, exOpts(s.ex));
  // Mirror the figure for the right side so it reads as "the other leg"
  player.fig.svg.firstChild.setAttribute("transform", s.side === "Right" ? "translate(240 0) scale(-1 1)" : "");
  // Figure animates during work; holds start pose while resting/getting ready
  if (s.type === "work") liveFigures.add(player.fig); else liveFigures.delete(player.fig);
  if (s.type !== "work") player.fig.draw(s.ex.poses[0]);
  if (s.type === "work") vibrate([40, 60, 40]); else vibrate(30);
}

function goStep(i) {
  if (!player) return;
  if (i >= player.steps.length) return finishFlow();
  player.i = Math.max(0, i);
  enterStep();
}

function togglePause() {
  player.paused = !player.paused;
  const pp = document.getElementById("pp");
  pp.innerHTML = player.paused ? ICON.play : ICON.pause;
  pp.setAttribute("aria-label", player.paused ? "Resume" : "Pause");
  const s = player.steps[player.i];
  if (player.paused) liveFigures.delete(player.fig);
  else if (s.type === "work") liveFigures.add(player.fig);
}

function playerLoop(now) {
  if (!player) return;
  const dt = (now - player.last) / 1000;
  player.last = now;
  if (!player.paused) player.elapsed += Math.min(dt, 0.5);
  const s = player.steps[player.i];
  const left = s.dur - player.elapsed;
  if (left <= 0) { goStep(player.i + 1); if (player) player.raf = requestAnimationFrame(playerLoop); return; }

  // Ring empties as time runs out
  document.getElementById("ringbar").setAttribute("stroke-dashoffset", (100 * player.elapsed / s.dur).toFixed(2));
  const shown = fmt(left);
  if (shown !== player.lastShown) {
    const t = document.getElementById("time");
    t.textContent = shown;
    if (Math.ceil(left) <= 3) { t.classList.remove("tick"); void t.offsetWidth; t.classList.add("tick"); }
    player.lastShown = shown;
  }
  // Progress bar per exercise
  const segs = document.querySelectorAll("#progress i");
  segs.forEach((seg, k) => {
    let w = 0;
    if (k < s.idx) w = 100;
    else if (k === s.idx) {
      const mine = player.steps.filter((x) => x.idx === k && x.type !== "rest" && x.type !== "ready");
      const total = mine.reduce((a, x) => a + x.dur, 0);
      let done = 0;
      for (let j = 0; j < player.i; j++) {
        const x = player.steps[j];
        if (x.idx === k && x.type !== "rest" && x.type !== "ready") done += x.dur;
      }
      if (s.type !== "rest" && s.type !== "ready") done += player.elapsed;
      w = total ? (100 * done) / total : 0;
    }
    seg.style.width = w + "%";
  });
  player.raf = requestAnimationFrame(playerLoop);
}

function finishFlow() {
  const flow = player.flow;
  stopPlayer();
  vibrate([60, 80, 60, 80, 120]);
  const cheers = ["Nice work.", "Loose & ready.", "Look at you go.", "Smooth moves."];
  show(`
    <div class="done">
      <div class="done-fig" id="donefig"></div>
      <h2>${cheers[Math.floor(Math.random() * cheers.length)]}</h2>
      <p>${esc(flow.name)} · ${fmtLong(flowSeconds(flow))} of moving</p>
      <button class="btn btn-primary" id="home" style="width:100%">Back to flows</button>
      <button class="btn" id="again" style="width:100%">Go again</button>
    </div>
  `);
  mountFigure(document.getElementById("donefig"), CELEBRATE, { accent: true, period: 900, stroke: 10, front: true });
  document.getElementById("home").onclick = renderHome;
  document.getElementById("again").onclick = () => startPlayer(flow);
}

/* ================= Boot ================= */
document.addEventListener("keydown", (e) => {
  if (!player) return;
  if (e.code === "Space") { e.preventDefault(); togglePause(); }
  if (e.code === "ArrowRight") goStep(player.i + 1);
  if (e.code === "ArrowLeft") goStep(player.i - 1);
});
renderHome();
