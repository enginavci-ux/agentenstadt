// Agentenstadt in 3D. Die Stadt schwebt als Insel im Himmel. In der Mitte steht das Rathaus, das Gehirn der Stadt. Darum liegen die Viertel der Familien,
// jedes Haus ist ein Agent. Die Figuren auf den Straßen sind die Agenten: Wer gerade arbeitet, bringt seine Aufträge
// zum Rathaus und läuft zurück. Graue Figuren sind Kunden. Ein Haus antippen öffnet es, dann sieht man hinein.
// three.js (MIT-Lizenz, siehe lib/THREE-LIZENZ.txt) liegt neben der Seite, nichts wird von fremden Servern geladen.
// Das Leuchten (Bloom) kommt aus den Zusatzmodulen von three.js in lib/. Fehlen sie, läuft die Stadt ohne Leuchten.
import * as THREE from "./lib/three.module.min.js";

const BLOCK = 16, STRASSE = 6, RASTER = BLOCK + STRASSE, LOT = 4.2, RING = RASTER / 2;
const AKTIV_MIN = 75;   // so lange nach der letzten Runde gilt ein Agent als "arbeitet gerade"
const RUHIG = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// Neu für den krassen Look: bloom = [Stärke, Radius, Schwelle] des Leuchtens, schwebend = die Insel schwebt im Himmel
// (fels = Farbe des Felsens darunter), laternen = Straßenlaternen (Farbe), lichtkegel = Lichtflecken unter Laternen, partikel = Wetter und Funkeln,
// datenstrahl = Lichtbögen von arbeitenden Agenten zum Rathaus (additiv = leuchtend), sonnenOrt = Stand der Sonne.
const TAG = {
  himmel: ["#4f9fe0", "#d3e9f6"], nebel: "#cfe3f1", hemi: ["#ffffff", "#80a070", 1.5], sonne: ["#ffe9c4", 2.9], sonnenOrt: [95, 80, 30],
  bloom: [0.32, 0.45, 0.97], schwebend: true, fels: "#8a735d",
  laternen: "#ffe2a8", lichtkegel: false, partikel: "wolken", datenstrahl: { additiv: false, deckkraft: 0.55 },
  schatten: true, boden: "#9fd083", park: "#8cc870", platte: "#e4e8ea", platz: "#f2f4f4", strasse: "#525962",
  markierung: "#f4f4ee", wasser: "#5fb3e0", berge: "#9fbdb0", fassade: "#2d3342", dach: "#3b4354",
  fensterAus: "#1c212b", fensterLicht: 0.6, turm: "#2fd8e6", turmLicht: 1.0, strahl: false, figur: "#1f2431",
  kunde: "#6f7a8e", baum: "#76c05a", stamm: "#7b5a3c", baeumeAn: true, kanten: null, fuellung: 1, pixel: 1,
  sterne: false, wasserAn: true, bergeAn: true, autos: ["#f2c94c", "#ffffff", "#5b8def", "#e96b8a", "#7fd1b9"],
  raster: null, dachLeuchten: 0, familienAnteil: 0.5, familienKanten: false,
  // Auf hellem Tag wirken die (für Text gedachten) dunklen Stufenfarben matt, hier leuchtendere Töne derselben Farbe.
  stufen: { wohlstand: "#E8B931", normal: "#45B072", sparen: "#EC9440", notlage: "#E5544A", tot: "#9AA19D", ungeboren: "#8CA2C6" }
};

const THEMEN = {
  planspiel: TAG,
  planspielNacht: Object.assign({}, TAG, {
    himmel: ["#050b1e", "#2a3a66"], nebel: "#141f3a", hemi: ["#9db0e0", "#1a2820", 0.75], sonne: ["#c8d4ff", 0.9], sonnenOrt: [70, 110, 45],
    bloom: [0.95, 0.55, 0.6], fels: "#3b3550",
    laternen: "#ffc978", lichtkegel: true, partikel: "glitzer", datenstrahl: { additiv: true, deckkraft: 0.75 },
    boden: "#355c35", park: "#2f5530", platte: "#59626d", platz: "#66707c", strasse: "#252a32", markierung: "#cfd2c8",
    wasser: "#183a5e", berge: "#2b3d4d", fassade: "#202533", dach: "#2b3141", fensterAus: "#121620",
    fensterLicht: 1.5, turmLicht: 1.6, strahl: true, figur: "#eef1f7", kunde: "#9aa6bd", baum: "#3d7445",
    stamm: "#4a3a2c", sterne: true, stufen: null, dachLeuchten: 0.3, familienAnteil: 0.32
  }),
  pixelnacht: {
    himmel: ["#05061a", "#3a2470"], nebel: "#1a1440", hemi: ["#5560a8", "#0b0b20", 0.9], sonne: ["#9fb0ff", 0.8], sonnenOrt: [70, 110, 45],
    bloom: [0.75, 0.35, 0.78], schwebend: true, fels: "#2d2560",
    laternen: "#ffcc48", lichtkegel: true, partikel: "glitzer", datenstrahl: { additiv: true, deckkraft: 0.85 },
    schatten: false, boden: "#1b1840", park: "#1c3341", platte: "#2b2760", platz: "#35307a", strasse: "#100e2c",
    markierung: "#ffe07a", wasser: "#141a5c", berge: "#1d1d4f", fassade: "#181d41", dach: "#23285a",
    fensterAus: "#2c2f63", fensterLicht: 1.7, turm: "#ffcc48", turmLicht: 1.6, strahl: true, figur: "#f3ead3",
    kunde: "#a2a7cf", baum: "#2f6b56", stamm: "#4b3a5a", baeumeAn: true, kanten: null, fuellung: 1, pixel: 0.4,
    sterne: true, wasserAn: true, bergeAn: true, autos: ["#ffe07a", "#7fa4ff", "#ff6d6d"], raster: null, stufen: null, dachLeuchten: 0.55, familienAnteil: 0.42, familienKanten: false
  },
  neon: {
    himmel: ["#030108", "#3a0d52"], nebel: "#1c0830", hemi: ["#6c3fa8", "#05020c", 0.7], sonne: ["#ff8ad8", 0.5], sonnenOrt: [70, 110, 45],
    bloom: [0.95, 0.55, 0.42], schwebend: true, fels: "#1b0c30",
    laternen: "#2ef2e2", lichtkegel: true, partikel: "regen", datenstrahl: { additiv: true, deckkraft: 0.9 },
    schatten: false, boden: "#0d0618", park: "#160a28", platte: "#15092a", platz: "#1d0d38", strasse: "#0a0514",
    markierung: "#ff3dcb", wasser: "#120830", berge: "#1a0a30", fassade: "#120a1f", dach: "#1a0f2e",
    fensterAus: "#2a1f3d", fensterLicht: 1.15, turm: "#ff3dcb", turmLicht: 2.0, strahl: true, figur: "#f5eeff",
    kunde: "#b7a6d6", baum: "#3a1d6b", stamm: "#2a1440", baeumeAn: true, kanten: "stufe", fuellung: 1, pixel: 1,
    sterne: true, wasserAn: true, bergeAn: false, autos: ["#2ef2e2", "#ff3dcb", "#ffe45c"], raster: null, stufen: null, dachLeuchten: 0.35, familienAnteil: 0.22, familienKanten: true
  },
  bauplan: {
    himmel: ["#0a2a4a", "#12406e"], nebel: null, hemi: ["#ffffff", "#ffffff", 1.4], sonne: ["#ffffff", 0], sonnenOrt: [70, 110, 45],
    bloom: [0.7, 0.4, 0.55], schwebend: true, fels: "#114070",
    laternen: null, lichtkegel: false, partikel: "scan", datenstrahl: { additiv: true, deckkraft: 0.9 },
    schatten: false, boden: "#0f3a63", park: "#0f3a63", platte: "#114070", platz: "#134879", strasse: "#0d3459",
    markierung: "#5c8dbc", wasser: "#0d3459", berge: "#0d3459", fassade: "#114070", dach: "#134879",
    fensterAus: "#114070", fensterLicht: 0, turm: "#ffe08a", turmLicht: 0.4, strahl: false, figur: "#eaf3ff",
    kunde: "#a8c4e0", baum: "#114070", stamm: "#114070", baeumeAn: false, kanten: "#eaf3ff", fuellung: 0.12,
    pixel: 1, sterne: false, wasserAn: false, bergeAn: false, autos: [], raster: "#3a6e9f", stufen: null, dachLeuchten: 0, familienAnteil: 0, familienKanten: true
  }
};

// Jede Familie bekommt eine eigene Farbe für ihr Viertel (wie die farbigen Viertel im Bild)
const FAMILIENFARBEN = ["#9b8cff", "#5cc8ff", "#5fd3a5", "#ffad66", "#ff7fb0", "#e3c75a", "#4fc9c2", "#c58cf0", "#8fb4ff", "#f28c8c"];
function familienFarbe(verteilung, schluessel) {
  return FAMILIENFARBEN[Math.max(0, verteilung.familien.indexOf(schluessel)) % FAMILIENFARBEN.length];
}

const STUFEN = { wohlstand: "Wohlstand", normal: "Normal", sparen: "Sparen", notlage: "Notlage", tot: "Tot", ungeboren: "Im Bau" };

const SYMBOLE = [
  ["rechner", /rechner|rechne|kalkul|formel/i], ["dokument", /vorlage|dokument|text|anleitung|schreib|vertrag|brief/i],
  ["karten", /lernkart|karte|lern|quiz|prüfung|pruefung|kurs/i], ["daten", /daten|tabelle|statist|analyse|liste|sammel/i],
  ["code", /code|programm|software|app\b|bot|skript|tool|werkzeug|automat/i],
  ["palette", /design|grafik|logo|bild|farbe|kunst|illustr/i], ["megafon", /marketing|werbung|social|news|nachricht|post|blog/i],
  ["blitz", /strom|energie|elektr|solar|lade|kabel|spannung/i], ["kurve", /markt|preis|handel|shop|verkauf|angebot/i],
  ["globus", /welt|reise|sprache|übersetz|uebersetz|international/i]
];

// ------------------------------------------------------------------ kleine Hilfen
function symbolFuer(a) {
  const text = `${a.geschaeft || ""} ${a.aktuell || ""} ${a.name || ""}`;
  for (const [name, muster] of SYMBOLE) if (muster.test(text)) return name;
  return "stern";
}
function css(name, ersatz) {
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return wert || ersatz;
}
function stufeVon(a) {
  if (a.status === "tot") return "tot";
  if (a.status === "ungeboren") return "ungeboren";
  return ["wohlstand", "normal", "sparen", "notlage"].includes(a.stufe) ? a.stufe : "normal";
}
function aktiv(a) {
  return a.status === "lebt" && !!a.letzte_runde && (Date.now() - new Date(a.letzte_runde).getTime()) < AKTIV_MIN * 60000;
}
function hausHoehe(a) {
  const v = Math.max(0, Number(a.vermoegen) || 0);
  return Math.min(205, 22 + 28 * Math.log2(1 + v / 2)) / 9.5;   // wie die 2D-Ansicht, in Metern der Szene
}
function kundenZahl(a) {
  // Kunden = Einnahmen der letzten 3 Tage (höchstens 3 Figuren)
  if (a.status !== "lebt") return 0;
  const grenze = Date.now() - 72 * 3600000;
  const n = (a.ereignisse || []).filter(e => e && e.typ === "einnahme" && new Date(e.zeit).getTime() > grenze).length;
  return Math.min(3, n);
}
function zufall(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function kurz(text, n) { text = String(text || ""); return text.length > n ? text.slice(0, n - 1) + "…" : text; }
const zahl = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function geld(v) { return zahl.format(Number(v) || 0) + " $"; }
function klemmen(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ------------------------------------------------------------------ Anordnung: ein Viertel je Familie
function bloeckeReihenfolge(ringe) {
  const liste = [];
  for (let i = -ringe; i <= ringe; i++) for (let j = -ringe; j <= ringe; j++) if (i || j) liste.push([i, j]);
  // Nah am Rathaus zuerst, bei Gleichstand die Blöcke vorne (zur Kamera hin)
  return liste.sort((p, q) => (Math.max(Math.abs(p[0]), Math.abs(p[1])) - Math.max(Math.abs(q[0]), Math.abs(q[1]))) ||
    (Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1])) || ((q[0] + q[1]) - (p[0] + p[1])));
}

function verteilen(agenten) {
  const nachId = {};
  agenten.forEach(a => { nachId[a.id] = a; });
  // In der Reihenfolge der Entstehung (a0, a1, a2 …): Ein neues Haus nimmt sich nur einen freien Platz,
  // alle schon stehenden Häuser bleiben, wo sie sind, auch wenn die Stadt wächst.
  const nr = a => { const m = /^a(\d+)$/.exec(String(a.id)); return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER; };
  const reihen = agenten.slice().sort((x, y) => nr(x) - nr(y));
  // Familie = Linie ab einem Kind des Gründers. Der Gründer selbst hat sein eigenes Viertel.
  const linie = a => {
    let x = a, schritte = 0;
    while (x.eltern && nachId[x.eltern] && nachId[x.eltern].eltern && schritte++ < 60) x = nachId[x.eltern];
    return x.id;
  };
  // Alle Blöcke bis zum 6. Ring stehen von Anfang an zur Wahl: So findet eine wachsende Familie fast immer einen
  // freien Nachbarblock, und ein neuer Ring verschiebt keine Häuser. Gezeichnet wird nur bis zum äußersten belegten Ring.
  const bloecke = bloeckeReihenfolge(6), frei = bloecke.map(() => true), belegt = new Map(), lage = {};
  const blockFamilie = new Map(), familieVon = {}, familien = [], bloeckeDer = new Map();
  const abstand = (x, y) => Math.max(Math.abs(bloecke[x][0] - bloecke[y][0]), Math.abs(bloecke[x][1] - bloecke[y][1]));
  const blockFuer = schluessel => {
    const eigene = bloeckeDer.get(schluessel) || [];
    const letzter = eigene[eigene.length - 1];
    if (letzter !== undefined && (belegt.get(letzter) || 0) < 4) return letzter;
    // Neuer Block: für eine Familie direkt neben ihren Blöcken, sonst möglichst nah am Rathaus
    let bester = -1, bestWert = Infinity;
    for (let i = 0; i < bloecke.length; i++) {
      if (!frei[i]) continue;
      const wert = eigene.length ? Math.min(...eigene.map(e => abstand(e, i))) * 1000 + i : i;
      if (wert < bestWert) { bestWert = wert; bester = i; }
    }
    if (bester < 0) bester = bloecke.findIndex((_, i) => (belegt.get(i) || 0) < 4);   // alles voll: irgendwo Platz
    if (bester < 0) return -1;   // mehr als 672 Häuser: der Rest bleibt in der Liste sichtbar
    frei[bester] = false;
    eigene.push(bester);
    bloeckeDer.set(schluessel, eigene);
    if (!blockFamilie.has(bester)) blockFamilie.set(bester, schluessel);
    return bester;
  };
  reihen.forEach(a => {
    const schluessel = linie(a);
    if (!familien.includes(schluessel)) familien.push(schluessel);
    familieVon[a.id] = schluessel;
    const block = blockFuer(schluessel);
    if (block < 0) return;
    const [bi, bj] = bloecke[block];
    const bx = bi * RASTER, bz = bj * RASTER;
    const lots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].sort((p, q) =>
      Math.hypot(bx + p[0] * LOT, bz + p[1] * LOT) - Math.hypot(bx + q[0] * LOT, bz + q[1] * LOT));
    const nummer = belegt.get(block) || 0;
    belegt.set(block, nummer + 1);
    const [lx, lz] = lots[nummer];
    lage[a.id] = { x: bx + lx * LOT, z: bz + lz * LOT, bx, bz, lx, lz };
  });
  const ringe = Math.max(1, ...[...belegt.keys()].map(i => Math.max(Math.abs(bloecke[i][0]), Math.abs(bloecke[i][1]))));
  return { lage, bloecke, belegt, ringe, blockFamilie, familieVon, familien };
}

// ------------------------------------------------------------------ Texturen (auf Canvas gemalt)
function leinwand(b, h) { const c = document.createElement("canvas"); c.width = b; c.height = h; return c; }
function rundesRechteck(g, x, y, b, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + b, y, x + b, y + h, r); g.arcTo(x + b, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + b, y, r); g.closePath();
}
function textur(c, pixel) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}

function fensterTexturen(stockwerke, licht, an, thema) {
  const b = 64, h = Math.max(16, stockwerke * 16), farbe = leinwand(b, h), glanz = leinwand(b, h);
  const f = farbe.getContext("2d"), g = glanz.getContext("2d");
  f.fillStyle = thema.fassade; f.fillRect(0, 0, b, h);
  g.fillStyle = "#000"; g.fillRect(0, 0, b, h);
  for (let s = 0; s < stockwerke; s++) {
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 15, y = s * 16 + 4, hell = licht() < an;
      // Nicht jedes Fenster gleich: mal warmes, mal kühles Licht, mal heller, mal gedimmt
      const warm = licht() < 0.7, staerke = 0.55 + licht() * 0.45;
      f.fillStyle = hell ? (warm ? "#fff1c9" : "#e2f0ff") : thema.fensterAus;
      f.fillRect(x, y, 10, 9);
      if (hell) { const w = Math.round(255 * staerke); g.fillStyle = `rgb(${w},${w},${w})`; g.fillRect(x, y, 10, 9); }
    }
  }
  const karte = textur(farbe, thema.pixel < 1), leuchten = textur(glanz, thema.pixel < 1);
  leuchten.colorSpace = THREE.NoColorSpace;
  return { karte, leuchten };
}

function symbolTextur(name, farbe, grund) {
  const c = leinwand(128, 128), g = c.getContext("2d");
  g.fillStyle = grund; g.strokeStyle = farbe; g.lineWidth = 7;
  rundesRechteck(g, 6, 6, 116, 116, 18); g.fill(); g.stroke();
  g.strokeStyle = farbe; g.fillStyle = farbe; g.lineWidth = 8; g.lineCap = "round"; g.lineJoin = "round";
  const linie = pkte => { g.beginPath(); pkte.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const bogen = (x, y, r, a, b, gegen) => { g.beginPath(); g.arc(x, y, r, a, b, !!gegen); g.stroke(); };
  switch (name) {
    case "code": linie([[48, 40], [26, 64], [48, 88]]); linie([[80, 40], [102, 64], [80, 88]]); linie([[72, 34], [56, 94]]); break;
    case "kurve": linie([[28, 92], [28, 32]]); linie([[28, 92], [100, 92]]); linie([[38, 80], [58, 62], [72, 72], [98, 40]]); linie([[84, 40], [98, 40], [98, 54]]); break;
    case "dokument": g.lineWidth = 6; g.strokeRect(36, 26, 56, 76); [44, 58, 72, 86].forEach(y => linie([[46, y], [82, y]])); break;
    case "megafon": g.beginPath(); g.moveTo(32, 54); g.lineTo(78, 32); g.lineTo(78, 96); g.lineTo(32, 74); g.closePath(); g.fill(); linie([[44, 76], [50, 98]]); linie([[90, 52], [98, 46]]); linie([[90, 76], [98, 82]]); break;
    case "palette": bogen(64, 64, 36, 0, Math.PI * 2); [[50, 50], [70, 44], [84, 60], [52, 76]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }); break;
    case "rechner": g.lineWidth = 6; g.strokeRect(36, 24, 56, 80); g.fillRect(44, 32, 40, 16); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.fillRect(44 + i * 14, 56 + j * 14, 9, 9); break;
    case "karten": g.lineWidth = 6; g.strokeRect(30, 40, 50, 60); g.strokeRect(48, 26, 50, 60); break;
    case "daten": for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(64, 38 + i * 24, 30, 10, 0, 0, Math.PI * 2); g.stroke(); } break;
    case "blitz": g.beginPath(); g.moveTo(72, 20); g.lineTo(40, 70); g.lineTo(62, 70); g.lineTo(54, 108); g.lineTo(90, 54); g.lineTo(68, 54); g.closePath(); g.fill(); break;
    case "globus": bogen(64, 64, 36, 0, Math.PI * 2); g.beginPath(); g.ellipse(64, 64, 16, 36, 0, 0, Math.PI * 2); g.stroke(); linie([[28, 64], [100, 64]]); break;
    case "gehirn":
      g.lineWidth = 7;
      g.beginPath(); g.ellipse(64, 66, 42, 34, 0, 0, Math.PI * 2); g.stroke();
      linie([[64, 34], [64, 98]]);
      bogen(44, 56, 11, Math.PI * 1.1, Math.PI * 2.1); bogen(46, 80, 10, Math.PI * 0.9, Math.PI * 1.9, true);
      bogen(84, 56, 11, Math.PI * 0.9, Math.PI * 1.9, true); bogen(82, 80, 10, Math.PI * 1.1, Math.PI * 2.1);
      break;
    default: {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 36, w = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(64 + r * Math.cos(w), 66 + r * Math.sin(w)); }
      g.closePath(); g.fill();
    }
  }
  return textur(c, false);
}

function himmelTextur(oben, unten) {
  const c = leinwand(4, 256), g = c.getContext("2d"), verlauf = g.createLinearGradient(0, 0, 0, 256);
  verlauf.addColorStop(0, oben); verlauf.addColorStop(1, unten);
  g.fillStyle = verlauf; g.fillRect(0, 0, 4, 256);
  return textur(c, false);
}

// Weicher runder Lichtfleck (für Lichtkegel unter Laternen und funkelnde Teilchen)
function glutTextur(eckig) {
  const c = leinwand(64, 64), g = c.getContext("2d");
  if (eckig) { g.fillStyle = "#ffffff"; g.fillRect(20, 20, 24, 24); return textur(c, true); }
  const verlauf = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  verlauf.addColorStop(0, "rgba(255,255,255,1)"); verlauf.addColorStop(0.35, "rgba(255,255,255,0.55)"); verlauf.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = verlauf; g.fillRect(0, 0, 64, 64);
  const t = textur(c, false);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ------------------------------------------------------------------ Die Stadt
export function starten(behaelter, optionen) {
  optionen = optionen || {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
  } catch (e) {
    return null;   // kein WebGL 2: die Seite zeigt dann die 2D-Stadt
  }
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(32, 1, 1, 1600);
  // Leuchten (Bloom): die Zusatzmodule werden nachgeladen. Bis sie da sind (oder wenn sie fehlen), ohne Leuchten.
  let effektModule = null, effekte = null;
  Promise.all([import("./lib/EffectComposer.js"), import("./lib/RenderPass.js"), import("./lib/UnrealBloomPass.js"), import("./lib/OutputPass.js")])
    .then(([ec, rp, ub, op]) => {
      effektModule = { EffectComposer: ec.EffectComposer, RenderPass: rp.RenderPass, UnrealBloomPass: ub.UnrealBloomPass, OutputPass: op.OutputPass };
      if (stadt) { effekteBauen(); groesse(); }
    })
    .catch(() => { effektModule = null; });
  function effekteBauen() {
    if (effekte) {
      try {
        effekte.composer.passes.forEach(p => { if (p.dispose) p.dispose(); });
        effekte.composer.dispose();
      } catch (e) { /* egal */ }
      effekte = null;
    }
    const bloom = stadt && stadt.thema.bloom;
    if (!effektModule || !bloom || zustand.verloren) return;
    try {
      const schmal = (behaelter.clientWidth || 800) < 600;
      const ziel = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: schmal ? 2 : 4 });
      const composer = new effektModule.EffectComposer(renderer, ziel);
      composer.addPass(new effektModule.RenderPass(szene, kamera));
      const pass = new effektModule.UnrealBloomPass(new THREE.Vector2(256, 256), bloom[0], bloom[1], bloom[2]);
      composer.addPass(pass);
      composer.addPass(new effektModule.OutputPass());
      effekte = { composer, bloom: pass };
    } catch (e) { effekte = null; }
  }
  const huelle = document.createElement("div");
  huelle.className = "d3-huelle";
  huelle.innerHTML =
    '<div class="d3-schilder"></div>' +
    '<div class="d3-blase" hidden></div>' +
    '<div class="d3-hilfe">Zur Seite ziehen: drehen · Haus antippen: hineinschauen</div>' +
    '<div class="d3-knoepfe" role="group" aria-label="Ansicht steuern">' +
    '<button type="button" data-knopf="links" aria-label="Nach links drehen" title="Nach links drehen">⟲</button>' +
    '<button type="button" data-knopf="rechts" aria-label="Nach rechts drehen" title="Nach rechts drehen">⟳</button>' +
    '<button type="button" data-knopf="rein" aria-label="Näher heran" title="Näher heran">+</button>' +
    '<button type="button" data-knopf="raus" aria-label="Weiter weg" title="Weiter weg">-</button>' +
    '<button type="button" data-knopf="mitte" aria-label="Ganze Stadt zeigen" title="Ganze Stadt zeigen">⌂</button></div>' +
    '<div class="d3-tipp" hidden></div>';
  const leinwandEl = renderer.domElement;
  leinwandEl.className = "d3-leinwand";
  leinwandEl.setAttribute("role", "img");
  leinwandEl.tabIndex = 0;
  huelle.prepend(leinwandEl);
  behaelter.innerHTML = "";
  behaelter.appendChild(huelle);
  const schilderEbene = huelle.querySelector(".d3-schilder"), blase = huelle.querySelector(".d3-blase");
  const tipp = huelle.querySelector(".d3-tipp"), hilfe = huelle.querySelector(".d3-hilfe");

  const zustand = {
    agenten: [], info: {}, design: optionen.design || "planspiel", signatur: "", gewaehlt: null, offen: null, hover: null,
    azimut: Math.PI / 4, polar: 0.95, radius: 120, ziel: new THREE.Vector3(),
    sollAzimut: Math.PI / 4, sollPolar: 0.95, sollRadius: 120, sollZiel: new THREE.Vector3(),
    grundRadius: 120, grundPolar: 0.95, zielY: 4, weite: 36, fokus: false, gebaut: false, sichtbar: true, laeuft: false, verloren: false,
    zeit: 0, puls: 0, tippZahl: 0, blaseB: 0, blaseH: 0, schilder: [], intro: 0, bedient: performance.now(), welle: 0
  };
  let stadt = null;   // alles, was beim Neuaufbau ersetzt wird

  function themaSchluessel() {
    const dunkel = getComputedStyle(document.documentElement).getPropertyValue("color-scheme").trim() === "dark";
    return zustand.design === "planspiel" && dunkel ? "planspielNacht" : (THEMEN[zustand.design] ? zustand.design : "planspiel");
  }

  // ---------- Aufbau ----------
  function entsorgen(objekt) {
    const texturen = new Set();
    objekt.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      // Lichter mit Schatten haben eigene Render-Ziele, die sonst liegen bleiben
      if (o.isLight && o.dispose) o.dispose();
      if (o.isInstancedMesh) o.dispose();   // gibt die Instanz-Puffer frei
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach(m => {
        Object.keys(m).forEach(k => { if (m[k] && m[k].isTexture) texturen.add(m[k]); });
        m.dispose();
      });
    });
    texturen.forEach(t => t.dispose());
  }
  function material(farbe, thema, extra) {
    const m = new THREE.MeshLambertMaterial(Object.assign({ color: farbe }, extra || {}));
    if (thema.fuellung < 1) { m.transparent = true; m.opacity = thema.fuellung; m.depthWrite = false; }
    return m;
  }
  function vollMaterial(farbe, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color: farbe }, extra || {})); }
  function kanten(mesh, farbe, gruppe) {
    const linien = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20),
      new THREE.LineBasicMaterial({ color: farbe, transparent: true, opacity: 0.95 }));
    linien.position.copy(mesh.position); linien.rotation.copy(mesh.rotation); linien.scale.copy(mesh.scale);
    gruppe.add(linien);
    return linien;
  }

  function baueBoden(thema, verteilung, gruppe, baumListe) {
    const weite = (verteilung.ringe + 0.5) * RASTER + STRASSE / 2, rand = weite + (thema.schwebend ? 9 : 16);
    if (thema.schwebend) baueFels(thema, rand, gruppe);
    else if (thema.wasserAn) {
      const wasser = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), material(thema.wasser, thema));
      wasser.rotation.x = -Math.PI / 2; wasser.position.y = -0.7;
      gruppe.add(wasser);
    }
    const insel = new THREE.Mesh(new THREE.BoxGeometry(2 * rand, 1.2, 2 * rand), material(thema.boden, thema));
    insel.position.y = -0.6; insel.receiveShadow = thema.schatten;
    gruppe.add(insel);
    if (thema.kanten) kanten(insel, thema.raster || (thema.kanten === "stufe" ? thema.markierung : thema.kanten), gruppe);
    const strasse = new THREE.Mesh(new THREE.PlaneGeometry(2 * weite, 2 * weite), material(thema.strasse, thema));
    strasse.rotation.x = -Math.PI / 2; strasse.position.y = 0.02; strasse.receiveShadow = thema.schatten;
    gruppe.add(strasse);
    if (thema.raster) {
      const raster = new THREE.GridHelper(2 * rand, Math.round(rand / 2), thema.raster, thema.raster);
      raster.position.y = 0.04; raster.material.transparent = true; raster.material.opacity = 0.35;
      gruppe.add(raster);
    }
    // Mittelstreifen und Zebrastreifen
    const strich = new THREE.MeshBasicMaterial({ color: thema.markierung, transparent: thema.fuellung < 1, opacity: thema.fuellung < 1 ? 0.6 : 1 });
    const linien = [];
    for (let k = -verteilung.ringe - 1; k <= verteilung.ringe; k++) linien.push((k + 0.5) * RASTER);
    const flach = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const quer = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));
    const eins = new THREE.Vector3(1, 1, 1), m4 = new THREE.Matrix4(), ort = new THREE.Vector3();
    const striche = [];
    for (const l of linien) {
      for (let t = -weite + 1.5; t <= weite - 1.5; t += 3.2) {
        if (linien.some(k => Math.abs(k - t) < STRASSE / 2 + 3.6)) continue;
        striche.push([t, l, flach], [l, t, quer]);
      }
    }
    const strichMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 0.18), strich, Math.max(1, striche.length));
    striche.forEach(([x, z, q], i) => strichMesh.setMatrixAt(i, m4.compose(ort.set(x, 0.05, z), q, eins)));
    strichMesh.count = striche.length;
    gruppe.add(strichMesh);
    const zebras = [];
    for (const lx of linien) for (const lz of linien) {
      for (let i = -2; i <= 2; i++) {
        for (const [dx, dz, q] of [[STRASSE / 2 + 1.6, 0, quer], [-(STRASSE / 2 + 1.6), 0, quer], [0, STRASSE / 2 + 1.6, flach], [0, -(STRASSE / 2 + 1.6), flach]]) {
          const x = lx + dx + (dz !== 0 ? i * 1.1 : 0), z = lz + dz + (dx !== 0 ? i * 1.1 : 0);
          if (Math.abs(x) > weite - 0.5 || Math.abs(z) > weite - 0.5) continue;
          zebras.push([x, z, q]);
        }
      }
    }
    const zebraMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 2.6), strich, Math.max(1, zebras.length));
    zebras.forEach(([x, z, q], i) => zebraMesh.setMatrixAt(i, m4.compose(ort.set(x, 0.05, z), q, eins)));
    zebraMesh.count = zebras.length;
    gruppe.add(zebraMesh);
    // Bäume auf dem Grünstreifen rund um die Stadt
    const r = zufall("rand");
    for (let i = 0; i < 64; i++) {
      const seite = i % 4, t = (r() * 2 - 1) * (rand - 3), tiefe = weite + 2.5 + r() * (rand - weite - 5);
      const [x, z] = seite === 0 ? [t, tiefe] : seite === 1 ? [t, -tiefe] : seite === 2 ? [tiefe, t] : [-tiefe, t];
      baumListe.push([x, z, 0.7 + r() * 0.6]);
    }
    if (thema.bergeAn && !thema.schwebend) {
      const rb = zufall("berge"), mat = material(thema.berge, thema, { flatShading: true });
      for (let i = 0; i < 22; i++) {
        const w = -Math.PI * 0.98 + i * 0.105 + rb() * 0.05, abstand = 250 + rb() * 70, hoehe = 20 + rb() * 40;
        const berg = new THREE.Mesh(new THREE.ConeGeometry(30 + rb() * 34, hoehe, 7), mat);
        berg.position.set(Math.cos(w) * abstand, hoehe / 2 - 1, Math.sin(w) * abstand);
        gruppe.add(berg);
      }
    }
    if (thema.sterne) {
      const rs = zufall("sterne"), punkte = [];
      for (let i = 0; i < (thema.schwebend ? 1100 : 700); i++) {
        const w = rs() * Math.PI * 2, h = thema.schwebend ? -1.4 + rs() * 2.8 : 0.1 + rs() * 1.3;
        punkte.push(Math.cos(w) * 700 * Math.cos(h), 700 * Math.sin(h), Math.sin(w) * 700 * Math.cos(h));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(punkte, 3));
      gruppe.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: "#fff7d6", size: 2, sizeAttenuation: false, fog: false })));
      const mond = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), new THREE.MeshBasicMaterial({ color: "#fff3cf", fog: false }));
      mond.position.set(-420, 300, -520);
      gruppe.add(mond);
    }
    return weite;
  }

  // Die Stadt schwebt: unter der Insel hängt ein zerklüfteter Fels, daneben schweben kleine Brocken
  function rauschen(x, y, z) {
    const t = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return t - Math.floor(t) - 0.5;
  }
  function baueFels(thema, rand, gruppe) {
    const tiefe = rand * 0.95, mat = material(thema.fels, thema, { flatShading: true });
    const geo = new THREE.CylinderGeometry(rand * Math.SQRT2, rand * 0.16, tiefe, 4, 6, false);
    geo.rotateY(Math.PI / 4);
    const pos = geo.getAttribute("position"), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (v.y > tiefe / 2 - 0.01) continue;   // die Oberkante bleibt genau unter der Insel
      const anteil = (tiefe / 2 - v.y) / tiefe;
      // Gleiche Punkte (an den Nähten doppelt vorhanden) bekommen dieselbe Verschiebung: keine Risse
      const kx = Math.round(v.x * 10) / 10, ky = Math.round(v.y * 10) / 10, kz = Math.round(v.z * 10) / 10;
      v.x += rauschen(kx, ky, kz) * rand * 0.32 * (0.35 + anteil);
      v.z += rauschen(kz, kx, ky) * rand * 0.32 * (0.35 + anteil);
      v.y += rauschen(ky, kz, kx) * tiefe * 0.14;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const fels = new THREE.Mesh(geo, mat);
    fels.position.y = -1.2 - tiefe / 2;
    gruppe.add(fels);
    if (thema.kanten) kanten(fels, thema.kanten === "stufe" ? thema.markierung : thema.kanten, gruppe);
    // Zacken, die nach unten hängen
    const r = zufall("zacken"), brocken = [];
    for (let i = 0; i < 7; i++) {
      const w = r() * Math.PI * 2, d = r() * rand * 0.55, hoehe = rand * (0.25 + r() * 0.35);
      const zacke = new THREE.Mesh(new THREE.ConeGeometry(rand * (0.1 + r() * 0.12), hoehe, 5), mat);
      zacke.rotation.x = Math.PI;
      zacke.position.set(Math.cos(w) * d, -1.2 - tiefe * (0.35 + r() * 0.4) - hoehe / 2, Math.sin(w) * d);
      gruppe.add(zacke);
    }
    // Kleine Brocken schweben um die Insel
    for (let i = 0; i < 9; i++) {
      const w = i / 9 * Math.PI * 2 + r() * 0.4, d = rand + 10 + r() * 34, groesse = 1.4 + r() * 3.6;
      const stein = new THREE.Mesh(new THREE.DodecahedronGeometry(groesse, 0), mat);
      stein.position.set(Math.cos(w) * d, -6 + r() * 14, Math.sin(w) * d);
      stein.rotation.set(r() * 3, r() * 3, r() * 3);
      if (r() < 0.6) {   // manche tragen ein Stück Wiese mit Baum
        const wiese = new THREE.Mesh(new THREE.CylinderGeometry(groesse * 0.95, groesse * 0.95, 0.35, 7), material(thema.boden, thema));
        wiese.position.y = groesse * 0.62;
        stein.rotation.set(0, r() * 3, 0);
        stein.add(wiese);
      }
      stein.userData.phase = r() * 6;
      stein.userData.y = stein.position.y;
      gruppe.add(stein);
      brocken.push(stein);
    }
    zustand.brocken = brocken;
  }

  function baueBlock(thema, bx, bz, istPlatz, gruppe, famFarbe) {
    let farbe = istPlatz ? thema.platz : thema.platte;
    if (famFarbe && thema.familienAnteil > 0) {
      farbe = "#" + new THREE.Color(thema.platte).lerp(new THREE.Color(famFarbe), thema.familienAnteil).getHexString();
    }
    const platte = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.3, BLOCK), material(farbe, thema));
    platte.position.set(bx, 0.15, bz); platte.receiveShadow = thema.schatten;
    gruppe.add(platte);
    if (famFarbe && thema.familienKanten) kanten(platte, famFarbe, gruppe);
    else if (thema.kanten) kanten(platte, thema.kanten === "stufe" ? thema.markierung : thema.kanten, gruppe);
  }

  function baeume(thema, positionen, gruppe) {
    if (!positionen.length || !thema.baeumeAn) return;
    const stamm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 6), material(thema.stamm, thema), positionen.length);
    const krone = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material(thema.baum, thema, { flatShading: true }), positionen.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    positionen.forEach(([x, z, g], i) => {
      stamm.setMatrixAt(i, m4.makeTranslation(x, 0.9, z));
      krone.setMatrixAt(i, m4.compose(v.set(x, 1.4 + g * 0.9, z), q, s.set(g, g * 1.25, g)));
    });
    stamm.castShadow = krone.castShadow = thema.schatten;
    gruppe.add(stamm, krone);
  }

  function baueTurm(thema, gruppe, picks) {
    const turm = new THREE.Group();
    const glow = new THREE.Color(thema.turm);
    const leuchten = new THREE.MeshBasicMaterial({ color: glow });
    const sockel = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6, 1.2, 40), material(thema.fassade, thema));
    sockel.position.y = 0.9;
    const rand = new THREE.Mesh(new THREE.TorusGeometry(5.55, 0.16, 8, 64), leuchten);
    rand.rotation.x = Math.PI / 2; rand.position.y = 1.55;
    const stufe2 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 1.4, 32), material(thema.fassade, thema));
    stufe2.position.y = 2.2;
    const koerperMat = material(thema.fassade, thema, { emissive: glow, emissiveIntensity: thema.turmLicht * 0.15 });
    const koerper = new THREE.Mesh(new THREE.BoxGeometry(3.2, 26, 3.2), koerperMat);
    koerper.position.y = 15.9;
    const teile = [sockel, rand, stufe2, koerper];
    for (const [dx, dz, ry] of [[1.62, 0, 0], [-1.62, 0, 0], [0, 1.62, Math.PI / 2], [0, -1.62, Math.PI / 2]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 22, 0.5), leuchten);
      s.position.set(dx, 15.4, dz); s.rotation.y = ry;
      teile.push(s);
    }
    for (let y = 6; y <= 26; y += 4) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(3.34, 0.12, 3.34), leuchten);
      band.position.y = y;
      teile.push(band);
    }
    // Zwei Ringe, die um den Turm kreisen: hier denkt die Stadt
    const drehung = new THREE.Group(), drehung2 = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.22, 10, 72), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.95 }));
    ring.rotation.x = Math.PI / 2 - 0.28;
    drehung.add(ring); drehung.position.y = 17;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.1, 8, 90), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.6 }));
    ring2.rotation.x = Math.PI / 2 + 0.18;
    drehung2.add(ring2); drehung2.position.y = 22;
    const spitze = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), material(thema.dach, thema));
    spitze.position.y = 31;
    const licht = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 12), leuchten);
    licht.position.y = 33.3;
    const schildTex = symbolTextur("gehirn", thema.turm, thema.fassade);
    const schildMat = new THREE.MeshBasicMaterial({ map: schildTex, transparent: true });
    const vorne = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), schildMat);
    vorne.position.set(0, 4.6, 1.62);
    const seite = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), schildMat);
    seite.position.set(1.62, 4.6, 0); seite.rotation.y = Math.PI / 2;
    teile.push(drehung, drehung2, spitze, licht, vorne, seite);
    let strahl = null;
    if (thema.strahl) {
      strahl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      strahl.position.y = 63;
      teile.push(strahl);
    }
    turm.add(...teile);
    [sockel, stufe2, koerper, vorne, seite].forEach(m => { m.castShadow = thema.schatten; picks.push(m); m.userData.id = "rathaus"; });
    if (thema.kanten) [sockel, stufe2, koerper].forEach(m => kanten(m, thema.kanten === "stufe" ? thema.turm : thema.kanten, turm));
    gruppe.add(turm);
    return { turm, drehung, drehung2, licht, koerperMat, strahl };
  }

  function baueHaus(a, ort, thema, farben, gruppe, picks, baumListe) {
    const haus = new THREE.Group();
    haus.position.set(ort.x, 0.3, ort.z);
    const stufe = stufeVon(a), farbe = farben[stufe], r = zufall(a.id);
    const grund = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 6.6), material(stufe === "tot" ? thema.park : thema.platte, thema));
    grund.position.y = 0.06; grund.receiveShadow = thema.schatten;
    haus.add(grund);
    const teile = { haus, fassaden: [], daecher: [], innen: null, innenGruppe: null, hoehe: 0, ort };
    const merken = (liste) => liste.forEach(m => { m.castShadow = thema.schatten; picks.push(m); m.userData.id = a.id; });
    if (a.status === "tot") {
      const truemmer = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 3.6), material(farbe, thema, { flatShading: true }));
      truemmer.position.y = 0.45; truemmer.rotation.y = 0.2;
      const steinMat = material("#9aa3a6", thema);
      const stein = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.45), steinMat);
      stein.position.set(0.6, 1.8, 1.4);
      const kappe = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.45, 16, 1, false, 0, Math.PI), steinMat);
      kappe.rotation.set(Math.PI / 2, 0, Math.PI / 2); kappe.position.set(0.6, 2.8, 1.4);
      haus.add(truemmer, stein, kappe);
      merken([truemmer, stein, kappe]);
      if (thema.kanten) [truemmer, stein].forEach(m => kanten(m, thema.kanten === "stufe" ? farbe : thema.kanten, haus));
      teile.hoehe = 3.2;
      baumListe.push([ort.x - 2.2, ort.z - 2, 0.8]);
    } else if (a.status === "ungeboren") {
      const fundament = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), material("#b9b4a8", thema));
      fundament.position.y = 0.3;
      const geruest = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 6, 5)), new THREE.LineBasicMaterial({ color: farbe }));
      geruest.position.y = 3.5;
      const gelb = material("#f2c94c", thema);
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.35, 13, 0.35), gelb);
      mast.position.set(2.8, 6.8, -2.8);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(9, 0.32, 0.32), gelb);
      arm.position.set(-0.6, 13.1, -2.8);
      const seil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5, 4), material("#333333", thema));
      seil.position.set(-3.6, 10.6, -2.8);
      haus.add(fundament, geruest, mast, arm, seil);
      merken([fundament, mast, arm]);
      teile.hoehe = 13.5;
    } else {
      const h = hausHoehe(a), stockwerke = Math.max(2, Math.round(h / 1.6));
      const tex = fensterTexturen(stockwerke, r, aktiv(a) ? 0.72 : 0.22, thema);
      const seite = material("#ffffff", thema, { map: tex.karte, emissiveMap: tex.leuchten, emissive: new THREE.Color(farbe), emissiveIntensity: thema.fensterLicht });
      const dachMat = material(thema.dach, thema);
      const dachFarbe = material(farbe, thema, { emissive: new THREE.Color(farbe), emissiveIntensity: thema.dachLeuchten || 0 });
      // Hohe Häuser bekommen eine schmalere Krone oben drauf: Die Gesamthöhe bleibt das Vermögen
      const krone = h > 8 ? Math.min(4.2, h * 0.22) : 0, hk = h - krone;
      const koerper = new THREE.Mesh(new THREE.BoxGeometry(5, hk, 5), [seite, seite, dachMat, dachMat, seite, seite]);
      koerper.position.y = hk / 2 + 0.12; koerper.receiveShadow = thema.schatten;
      const dach = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.45, 5.5), dachFarbe);
      dach.position.y = hk + 0.34;
      const kronenTeile = [];
      if (krone) {
        const oben = new THREE.Mesh(new THREE.BoxGeometry(3.7, krone, 3.7), [seite, seite, dachMat, dachMat, seite, seite]);
        oben.position.y = hk + 0.56 + krone / 2;
        const kappe = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.32, 4.1), dachFarbe);
        kappe.position.y = hk + 0.56 + krone + 0.16;
        kronenTeile.push(oben, kappe);
        haus.add(oben, kappe);
      }
      const dachOben = krone ? hk + 0.56 + krone + 0.32 : h + 0.56;
      const aufbau = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.4), dachMat);
      aufbau.position.set(krone ? -0.6 : -1, dachOben + 0.4, krone ? -0.5 : -0.8);
      const tuer = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), new THREE.MeshBasicMaterial({ color: farbe }));
      tuer.position.set(0, 0.97, 2.51);
      haus.add(koerper, dach, aufbau, tuer);
      // Schild mit dem Symbol des Geschäfts, oben an zwei Seiten
      const symbol = symbolTextur(symbolFuer(a), farbe, thema.fassade);
      const schildMat = new THREE.MeshBasicMaterial({ map: symbol, transparent: true });
      const groesse = klemmen(h * 0.22, 1.6, 2.6);
      const vorne = new THREE.Mesh(new THREE.PlaneGeometry(groesse, groesse), schildMat);
      vorne.position.set(0, Math.max(groesse * 0.7 + 1.9, hk - groesse * 0.7), 2.52);
      const seitlich = new THREE.Mesh(new THREE.PlaneGeometry(groesse, groesse), schildMat);
      seitlich.position.set(2.52, vorne.position.y, 0); seitlich.rotation.y = Math.PI / 2;
      haus.add(vorne, seitlich);
      if (stufe === "wohlstand") {
        const antenne = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), dachMat);
        antenne.position.set(krone ? 0.9 : 1.2, dachOben + 1.5, krone ? 0.9 : 1.2);
        const warnlicht = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: "#ff4040" }));
        warnlicht.position.set(antenne.position.x, dachOben + 3.05, antenne.position.z);
        warnlicht.userData.blinkt = true;
        haus.add(antenne, warnlicht);
      }
      if (aktiv(a)) {
        const lampe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: farbe }));
        lampe.position.set(krone ? 1.0 : 1.2, dachOben + 0.35, krone ? -1.0 : -1.4);
        lampe.userData.blinkt = true;
        haus.add(lampe);
      }
      merken([koerper, dach, aufbau, vorne, seitlich, tuer, ...kronenTeile]);
      if (thema.kanten) [koerper, dach, ...kronenTeile].forEach(m => kanten(m, thema.kanten === "stufe" ? farbe : thema.kanten, haus));
      teile.fassaden = [seite];
      teile.daecher = [dachMat, dachFarbe];
      teile.hoehe = dachOben + 0.45;
      teile.innen = () => innenraum(hk, farbe, thema, a);
    }
    gruppe.add(haus);
    return teile;
  }

  function innenraum(h, farbe, thema, a) {
    // Blick ins Haus: Böden bis zur Arbeitsetage, Schreibtisch, Bildschirm mit dem Symbol des Geschäfts, der Agent.
    const innen = new THREE.Group();
    const etage = klemmen(2.2 * Math.floor(h * 0.45 / 2.2), 0, Math.max(0, h - 2.2));
    const bodenMat = vollMaterial("#d9dee4", { emissive: new THREE.Color(farbe), emissiveIntensity: 0.08 });
    for (let y = 0; y <= etage + 0.01; y += 2.2) {
      const boden = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.1, 4.7), bodenMat);
      boden.position.y = y + 0.18;
      innen.add(boden);
    }
    const y0 = etage + 0.23;
    const holz = vollMaterial("#8a6a4a");
    const tisch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.1), holz);
    tisch.position.set(0, y0 + 0.8, -0.7);
    [[-1.05, -0.3], [1.05, -0.3], [-1.05, -1.1], [1.05, -1.1]].forEach(([x, z]) => {
      const bein = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), holz);
      bein.position.set(x, y0 + 0.4, z);
      innen.add(bein);
    });
    const bildschirm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.08), vollMaterial("#20242c"));
    bildschirm.position.set(0, y0 + 1.33, -1.0);
    const anzeige = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.75),
      new THREE.MeshBasicMaterial({ map: symbolTextur(symbolFuer(a), farbe, "#10141b") }));
    anzeige.position.set(0, y0 + 1.33, -0.955);
    const figur = figurMesh(thema.figur === "#1f2431" ? "#1f2431" : "#f2f2f2", farbe, 0.95, false);
    figur.position.set(0, y0, 0.45); figur.rotation.y = Math.PI;
    const pflanze = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), vollMaterial("#5aa55a", { flatShading: true }));
    pflanze.position.set(1.7, y0 + 0.45, 1.6);
    innen.add(tisch, bildschirm, anzeige, figur, pflanze);
    return innen;
  }

  function figurMesh(farbeKoerper, farbeSchal, groesse, schatten) {
    const figur = new THREE.Group();
    const mat = vollMaterial(farbeKoerper);
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 1.0, 10), mat);
    koerper.position.y = 0.55;
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat);
    kopf.position.y = 1.35;
    const schal = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 6, 16), new THREE.MeshBasicMaterial({ color: farbeSchal }));
    schal.rotation.x = Math.PI / 2; schal.position.y = 1.02;
    const augeMat = new THREE.MeshBasicMaterial({ color: farbeKoerper === "#1f2431" ? "#ffffff" : "#1f2431" });
    const auge1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), augeMat), auge2 = auge1.clone();
    auge1.position.set(-0.14, 1.42, 0.37); auge2.position.set(0.14, 1.42, 0.37);
    figur.add(koerper, kopf, schal, auge1, auge2);
    figur.scale.setScalar(groesse || 1);
    if (schatten) figur.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return figur;
  }

  // Wege über die Straßen: vom Haus zum Rathaus und für Kunden von der Straße zur Ladentür
  function pfad(punkte) {
    const ergebnis = [];
    punkte.forEach(([x, z]) => {
      const letzter = ergebnis[ergebnis.length - 1];
      if (!letzter || Math.hypot(letzter.x - x, letzter.z - z) > 0.05) ergebnis.push(new THREE.Vector3(x, 0.32, z));
    });
    const laengen = [0];
    for (let i = 1; i < ergebnis.length; i++) laengen.push(laengen[i - 1] + ergebnis[i].distanceTo(ergebnis[i - 1]));
    return { punkte: ergebnis, laengen, laenge: laengen[laengen.length - 1] };
  }
  function wegZumRathaus(ort) {
    const s = v => (v >= 0 ? 1 : -1);
    const seite = s(ort.lx);
    const xStrasse = ort.bx + seite * RING;
    const zLinie = ort.bz > 0 ? ort.bz - RING : (ort.bz < 0 ? ort.bz + RING : s(ort.lz) * RING);
    const sx = s(xStrasse), sz = s(zLinie);
    return pfad([[ort.x + seite * 2.9, ort.z + 1.2], [xStrasse, ort.z + 1.2], [xStrasse, zLinie], [sx * RING, zLinie],
      [sx * RING, sz * RING], [sx * 8.2, sz * 8.2], [sx * 5.4, sz * 5.4]]);
  }
  function wegUmsHaus(ort) {
    const r = 3.65;
    return pfad([[ort.x - r, ort.z + r], [ort.x + r, ort.z + r], [ort.x + r, ort.z - r], [ort.x - r, ort.z - r], [ort.x - r, ort.z + r]]);
  }
  function wegZurTuer(ort, j) {
    const seite = ort.lx >= 0 ? 1 : -1;
    const z = ort.z + 3.55 + j * 0.12;
    return pfad([[ort.bx + seite * RING, z], [ort.x + (j - 1) * 0.5, z], [ort.x + (j - 1) * 0.15, ort.z + 2.95]]);
  }
  function aufWeg(w, t, ziel) {
    t = klemmen(t, 0, w.laenge);
    let i = 1;
    while (i < w.laengen.length - 1 && w.laengen[i] < t) i++;
    const a = w.punkte[i - 1], b = w.punkte[i] || a;
    const anteil = (t - w.laengen[i - 1]) / Math.max(0.0001, (w.laengen[i] || 0) - w.laengen[i - 1]);
    ziel.lerpVectors(a, b, klemmen(anteil, 0, 1));
    return Math.atan2(b.x - a.x, b.z - a.z);
  }

  function autosBauen(thema, weite, gruppe) {
    const autos = [];
    if (!thema.autos.length) return autos;
    const ringe = [RING, RING + RASTER, RING + 2 * RASTER].filter(r => r < weite);
    const r = zufall("autos");
    // Scheinwerfer vorne, Rücklichter hinten: nachts leuchten sie
    const vorneMat = new THREE.MeshBasicMaterial({ color: "#fff4d2" }), hintenMat = new THREE.MeshBasicMaterial({ color: "#ff2a3a" });
    const lichtGeo = new THREE.BoxGeometry(0.34, 0.2, 0.06);
    let n = 0;
    ringe.forEach((ringR, ri) => {
      for (let i = 0; i < 4 + ri * 4; i++) {
        const auto = new THREE.Group();
        const unten = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.8), vollMaterial(thema.autos[n++ % thema.autos.length]));
        unten.position.y = 0.5;
        const oben = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.5), vollMaterial("#dfe6ee"));
        oben.position.set(0, 1.05, -0.15);
        auto.add(unten, oben);
        for (const x of [-0.5, 0.5]) {
          const v = new THREE.Mesh(lichtGeo, vorneMat); v.position.set(x, 0.58, 1.42);
          const h = new THREE.Mesh(lichtGeo, hintenMat); h.position.set(x, 0.58, -1.42);
          auto.add(v, h);
        }
        if (thema.schatten) auto.traverse(o => { if (o.isMesh) o.castShadow = true; });
        gruppe.add(auto);
        const seite = r() < 0.5 ? 1 : -1;
        autos.push({ auto, ring: ringR, spur: seite * 1.4, t: r() * 8 * ringR, tempo: (5 + r() * 3) * seite });
      }
    });
    return autos;
  }
  function aufRing(ringR, spur, t, ziel) {
    const r = ringR + spur, umfang = 8 * r;
    t = ((t % umfang) + umfang) % umfang;
    const seite = Math.floor(t / (2 * r)), rest = t - seite * 2 * r;
    const ecken = [[-r, -r], [r, -r], [r, r], [-r, r]];
    const [ax, az] = ecken[seite], [bx, bz] = ecken[(seite + 1) % 4];
    const anteil = rest / (2 * r);
    ziel.set(ax + (bx - ax) * anteil, 0.05, az + (bz - az) * anteil);
    return Math.atan2(bx - ax, bz - az);
  }

  // ---------- Krasser Look: Skyline, Laternen, Wetter, Datenstrahlen, Münzen ----------
  // Straßenlaternen an den Straßenrändern, nachts mit Lichtfleck darunter
  function baueLaternen(thema, verteilung, weite, gruppe) {
    if (!thema.laternen) return;
    const orte = [];
    const linien = [];
    for (let k = -verteilung.ringe - 1; k <= verteilung.ringe; k++) linien.push((k + 0.5) * RASTER);
    for (const l of linien) {
      for (let t = -weite + RASTER / 2; t <= weite - 2; t += RASTER / 2) {
        if (linien.some(k => Math.abs(k - t) < STRASSE / 2 + 1)) continue;
        orte.push([t, l + STRASSE / 2 - 0.35], [l - STRASSE / 2 + 0.35, t]);
      }
    }
    if (!orte.length) return;
    const m4 = new THREE.Matrix4();
    const mast = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 2.8, 5), vollMaterial(thema.dach), orte.length);
    const kopf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.18, 0.42), new THREE.MeshBasicMaterial({ color: thema.laternen }), orte.length);
    orte.forEach(([x, z], i) => {
      mast.setMatrixAt(i, m4.makeTranslation(x, 1.45, z));
      kopf.setMatrixAt(i, m4.makeTranslation(x, 2.9, z));
    });
    gruppe.add(mast, kopf);
    if (thema.lichtkegel) {
      const fleck = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({
        color: thema.laternen, map: glutTextur(false), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false
      }), orte.length);
      const flach = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), eins = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
      orte.forEach(([x, z], i) => fleck.setMatrixAt(i, m4.compose(v.set(x, 0.07, z), flach, eins)));
      fleck.renderOrder = 2;
      gruppe.add(fleck);
    }
  }

  // Wetter und Funkeln: Wolken am Tag, Glühwürmchen in der Nacht, Regen in der Neonstadt, Scanner im Bauplan
  function bauePartikel(thema, weite, gruppe) {
    const art = thema.partikel;
    if (!art || RUHIG) return null;
    const r = zufall("partikel");
    if (art === "wolken") {
      // Weiche Wolken aus Lichtflecken (zeigen immer zur Kamera), über und unter der schwebenden Insel
      const tex = glutTextur(false), wolken = [];
      for (let i = 0; i < 12; i++) {
        const wolke = new THREE.Group();
        const unten = thema.schwebend && i % 2 === 1;
        const teile = 4 + Math.floor(r() * 4);
        for (let k = 0; k < teile; k++) {
          const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: "#ffffff", transparent: true, opacity: 0.78, depthWrite: false }));
          const g = 14 + r() * 14;
          puff.scale.set(g * 1.5, g, 1);
          puff.position.set((k - teile / 2) * 7 + (r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 8);
          wolke.add(puff);
        }
        const w = i / 12 * Math.PI * 2 + r() * 0.5, abstand = unten ? weite + 30 + r() * 90 : weite + 120 + r() * 160;
        wolke.position.set(Math.cos(w) * abstand, unten ? -52 + r() * 22 : 30 + r() * 36, Math.sin(w) * abstand);
        wolke.userData.winkel = w; wolke.userData.abstand = abstand;
        wolke.userData.tempo = 0.004 + r() * 0.006;
        gruppe.add(wolke);
        wolken.push(wolke);
      }
      return { art, wolken };
    }
    if (art === "scan") {
      // Eine Scan-Ebene fährt langsam durch die Stadt nach oben
      const ebene = new THREE.Mesh(new THREE.PlaneGeometry(2 * weite, 2 * weite), new THREE.MeshBasicMaterial({
        color: "#7fd0ff", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }));
      ebene.rotation.x = -Math.PI / 2;
      const rand = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2 * weite, 2 * weite)), new THREE.LineBasicMaterial({ color: "#bfe6ff" }));
      rand.rotation.x = -Math.PI / 2;
      const scanner = new THREE.Group();
      scanner.add(ebene, rand);
      gruppe.add(scanner);
      return { art, scanner };
    }
    const anzahl = art === "regen" ? 900 : 260;
    const punkte = new Float32Array(anzahl * (art === "regen" ? 6 : 3));
    const feld = weite + 30, hoehe = art === "regen" ? 70 : 26;
    for (let i = 0; i < anzahl; i++) {
      const x = (r() - 0.5) * 2 * feld, y = r() * hoehe + (art === "regen" ? 0 : 1.5), z = (r() - 0.5) * 2 * feld;
      if (art === "regen") punkte.set([x, y, z, x - 0.25, y - 1.6, z], i * 6);
      else punkte.set([x, y, z], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(punkte, 3));
    if (art === "regen") {
      const regen = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#b48cff", transparent: true, opacity: 0.22, depthWrite: false }));
      gruppe.add(regen);
      return { art, objekt: regen, hoehe, anzahl };
    }
    const farbe = thema.laternen || thema.turm;
    const funken = new THREE.Points(geo, new THREE.PointsMaterial({
      color: farbe, size: thema.pixel < 1 ? 1.1 : 0.9, map: glutTextur(thema.pixel < 1), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    funken.userData.basis = punkte.slice();
    gruppe.add(funken);
    return { art, objekt: funken, hoehe, anzahl };
  }

  // Wer gerade arbeitet, schickt Lichtpakete über einen Bogen zum Rathaus: So sieht man, wer aktiv ist
  function baueDatenstrahlen(thema, haeuser, farben, gruppe) {
    const strahlen = [];
    const ds = thema.datenstrahl || { additiv: false, deckkraft: 0.5 };
    zustand.agenten.forEach(a => {
      const teile = haeuser[a.id];
      if (!teile || !aktiv(a)) return;
      const farbe = new THREE.Color(farben[stufeVon(a)]);
      const von = new THREE.Vector3(teile.ort.x, teile.hoehe + 0.6, teile.ort.z);
      const nach = new THREE.Vector3(0, 27, 0);
      const mitte = von.clone().lerp(nach, 0.5);
      mitte.y = Math.max(von.y, nach.y) + 10 + von.distanceTo(nach) * 0.25;
      const kurve = new THREE.QuadraticBezierCurve3(von, mitte, nach);
      const bahn = new THREE.Mesh(new THREE.TubeGeometry(kurve, 40, 0.07, 5, false), new THREE.MeshBasicMaterial({
        color: farbe, transparent: true, opacity: ds.deckkraft * 0.45, depthWrite: false,
        blending: ds.additiv ? THREE.AdditiveBlending : THREE.NormalBlending
      }));
      gruppe.add(bahn);
      const pakete = [];
      const paketMat = new THREE.MeshBasicMaterial({ color: farbe.clone().lerp(new THREE.Color("#ffffff"), 0.35) });
      for (let k = 0; k < 3; k++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), paketMat);
        gruppe.add(p);
        pakete.push({ p, t: k / 3 });
      }
      strahlen.push({ kurve, pakete, tempo: 0.16 + zufall(a.id + "s")() * 0.08 });
    });
    return strahlen;
  }

  // Wer schon Geld eingenommen hat, bekommt eine Münze, die über dem Dach schwebt
  function baueMuenzen(haeuser, gruppe) {
    const muenzen = [];
    const gold = new THREE.MeshLambertMaterial({ color: "#f5c242", emissive: new THREE.Color("#c98a10"), emissiveIntensity: 0.55 });
    const rand = new THREE.MeshBasicMaterial({ color: "#ffe39a" });
    zustand.agenten.forEach(a => {
      const teile = haeuser[a.id];
      if (!teile || a.status !== "lebt" || !(Number(a.einnahmen) > 0)) return;
      const muenze = new THREE.Group();
      const scheibe = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.22, 28), gold);
      scheibe.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 6, 28), rand);
      const zeichen = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.28), rand);
      muenze.add(scheibe, ring, zeichen);
      const y = teile.hoehe + 3.2;
      muenze.position.set(teile.ort.x, y, teile.ort.z);
      gruppe.add(muenze);
      teile.ueberDach = 3.6;
      muenzen.push({ muenze, y, phase: zufall(a.id + "m")() * 6 });
    });
    return muenzen;
  }

  // Rathaus: Herzschlag-Welle auf dem Platz und drei kreisende Satelliten
  function baueRathausExtras(thema, gruppe) {
    const glow = new THREE.Color(thema.turm);
    const welle = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({
      color: glow, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide,
      blending: thema.bloom && thema.bloom[2] < 0.9 ? THREE.AdditiveBlending : THREE.NormalBlending
    }));
    welle.rotation.x = -Math.PI / 2; welle.position.y = 0.36;
    gruppe.add(welle);
    const kreis = new THREE.Group();
    kreis.position.y = 12;
    const satMat = new THREE.MeshBasicMaterial({ color: glow });
    for (let k = 0; k < 3; k++) {
      const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), satMat);
      const w = k / 3 * Math.PI * 2;
      sat.position.set(Math.cos(w) * 6.8, Math.sin(w * 2) * 1.2, Math.sin(w) * 6.8);
      kreis.add(sat);
    }
    gruppe.add(kreis);
    return { welle, kreis };
  }

  function aufbauen() {
    const schluessel = themaSchluessel();
    // Sehr große Städte ohne Schatten, das schont schwache Grafikchips
    const thema = Object.assign({}, THEMEN[schluessel], zustand.agenten.length > 60 ? { schatten: false } : {});
    if (stadt) { szene.remove(stadt.gruppe); entsorgen(stadt.gruppe); }
    if (szene.background && szene.background.dispose) szene.background.dispose();
    const gruppe = new THREE.Group();
    const farben = thema.stufen || {
      wohlstand: css("--wohlstand", "#E3B743"), normal: css("--normal", "#5BBF86"), sparen: css("--sparen", "#E99A4A"),
      notlage: css("--notlage", "#F38379"), tot: css("--tot", "#A5ABA8"), ungeboren: css("--ungeboren", "#96A7C0")
    };
    szene.background = himmelTextur(thema.himmel[0], thema.himmel[1]);
    szene.fog = thema.nebel ? new THREE.Fog(thema.nebel, 150, 520) : null;
    const hemi = new THREE.HemisphereLight(thema.hemi[0], thema.hemi[1], thema.hemi[2]);
    const sonne = new THREE.DirectionalLight(thema.sonne[0], thema.sonne[1]);
    sonne.position.set(...(thema.sonnenOrt || [70, 110, 45]));
    renderer.shadowMap.enabled = !!thema.schatten;
    gruppe.add(hemi, sonne);

    const verteilung = verteilen(zustand.agenten);
    const picks = [], baumListe = [], r = zufall("baeume");
    zustand.brocken = [];
    const weite = baueBoden(thema, verteilung, gruppe, baumListe);
    zustand.weite = weite;
    if (thema.schatten) {
      sonne.castShadow = true;
      sonne.shadow.mapSize.set(2048, 2048);
      const s = sonne.shadow.camera, w = weite + 10;
      s.left = -w; s.right = w; s.top = w; s.bottom = -w; s.near = 10; s.far = 420;
      s.updateProjectionMatrix();
      sonne.shadow.bias = -0.0006;
    }
    for (let i = -verteilung.ringe; i <= verteilung.ringe; i++) for (let j = -verteilung.ringe; j <= verteilung.ringe; j++) {
      const bx = i * RASTER, bz = j * RASTER, istPlatz = i === 0 && j === 0;
      const index = istPlatz ? -1 : verteilung.bloecke.findIndex(([p, q]) => p === i && q === j);
      const familie = index >= 0 ? verteilung.blockFamilie.get(index) : undefined;
      baueBlock(thema, bx, bz, istPlatz, gruppe, familie !== undefined ? familienFarbe(verteilung, familie) : null);
      if (istPlatz) {
        for (let k = 0; k < 12; k++) { const w = k / 12 * Math.PI * 2; baumListe.push([Math.cos(w) * 7.2, Math.sin(w) * 7.2, 0.62]); }
        continue;
      }
      const belegt = index >= 0 ? (verteilung.belegt.get(index) || 0) : 0;
      // Freie Grundstücke werden kleine Parks
      const lots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].sort((p, q) => Math.hypot(bx + p[0] * LOT, bz + p[1] * LOT) - Math.hypot(bx + q[0] * LOT, bz + q[1] * LOT));
      lots.slice(belegt).forEach(([lx, lz]) => {
        for (let k = 0; k < 3; k++) baumListe.push([bx + lx * LOT + (r() - 0.5) * 4, bz + lz * LOT + (r() - 0.5) * 4, 0.6 + r() * 0.5]);
      });
      for (let k = 0; k < 4; k++) baumListe.push([bx + (k % 2 ? 1 : -1) * (BLOCK / 2 - 0.7), bz + (k < 2 ? 1 : -1) * (BLOCK / 2 - 0.7), 0.5]);
    }
    const haeuser = {};
    zustand.agenten.forEach(a => {
      const ort = verteilung.lage[a.id];
      if (ort) haeuser[a.id] = baueHaus(a, ort, thema, farben, gruppe, picks, baumListe);
    });
    baeume(thema, baumListe, gruppe);
    // Bögen von Eltern zu Kind, in der Farbe der Familie des Kindes. Je größer die Stadt, desto weiter weg ist die
    // Kamera: dann werden sie dicker, damit sie in der Übersicht sichtbar bleiben.
    const bogenDicke = 0.16 + 0.08 * verteilung.ringe;
    const bogenMats = new Map();
    const bogenMat = familie => {
      if (!bogenMats.has(familie)) {
        bogenMats.set(familie, new THREE.MeshBasicMaterial({ color: familienFarbe(verteilung, familie), transparent: true, opacity: 0.9 }));
      }
      return bogenMats.get(familie);
    };
    zustand.agenten.forEach(a => {
      const kind = haeuser[a.id], eltern = a.eltern && haeuser[a.eltern];
      if (!kind || !eltern) return;
      const von = new THREE.Vector3(eltern.ort.x, eltern.hoehe + 0.5, eltern.ort.z);
      const nach = new THREE.Vector3(kind.ort.x, kind.hoehe + 0.5, kind.ort.z);
      const mitte = von.clone().lerp(nach, 0.5);
      mitte.y = Math.max(von.y, nach.y) + 3 + von.distanceTo(nach) * 0.3;
      const kurve = new THREE.QuadraticBezierCurve3(von, mitte, nach);
      gruppe.add(new THREE.Mesh(new THREE.TubeGeometry(kurve, 48, bogenDicke, 6, false), bogenMat(verteilung.familieVon[a.id])));
    });
    const turm = baueTurm(thema, gruppe, picks);
    // Figuren: jeder lebende Agent. Wer gerade arbeitet, bringt Aufträge ins Rathaus, die anderen spazieren um ihr
    // Haus. Dazu Kunden vor den Läden. Wo eine Figur gerade läuft, bleibt beim Neuaufbau erhalten.
    const vorher = new Map((stadt ? stadt.figuren : []).map(f => [f.schluessel, f]));
    const figuren = [];
    const figurAnlegen = (schluessel, figur, weg, modus, tempo, rr) => {
      const alt = vorher.get(schluessel);
      const f = { schluessel, figur, weg, modus, tempo, richtung: 1, t: rr() * weg.laenge, pause: rr() * 3, bisPause: 4 + rr() * 6, rr };
      if (alt && alt.modus === modus) Object.assign(f, { t: Math.min(alt.t, weg.laenge), richtung: alt.richtung, pause: alt.pause, bisPause: alt.bisPause });
      figuren.push(f);
    };
    zustand.agenten.forEach(a => {
      const ort = verteilung.lage[a.id];
      if (!ort || a.status !== "lebt") return;
      const farbe = farben[stufeVon(a)], rr = zufall(a.id + "f");
      const figur = figurMesh(thema.figur, farbe, 1.6, thema.schatten);
      figur.traverse(o => { if (o.isMesh) { picks.push(o); o.userData.id = a.id; } });
      gruppe.add(figur);
      if (aktiv(a)) figurAnlegen(a.id, figur, wegZumRathaus(ort), "rathaus", 2 + rr() * 0.8, rr);
      else figurAnlegen(a.id, figur, wegUmsHaus(ort), "spazieren", 0.7 + rr() * 0.4, rr);
      for (let j = 0; j < kundenZahl(a); j++) {
        const kunde = figurMesh(thema.kunde, thema.kunde, 1.3, thema.schatten);
        gruppe.add(kunde);
        figurAnlegen(`${a.id}:k${j}`, kunde, wegZurTuer(ort, j), "kunde", 1.4 + rr() * 0.6, rr);
      }
    });
    const autos = autosBauen(thema, weite, gruppe);
    baueLaternen(thema, verteilung, weite, gruppe);
    const partikel = bauePartikel(thema, weite, gruppe);
    const strahlen = baueDatenstrahlen(thema, haeuser, farben, gruppe);
    const muenzen = baueMuenzen(haeuser, gruppe);
    const extras = baueRathausExtras(thema, gruppe);
    szene.add(gruppe);
    leinwandEl.style.imageRendering = thema.pixel < 1 ? "pixelated" : "auto";
    stadt = { gruppe, picks, haeuser, turm, figuren, autos, thema, farben, schluessel, verteilung, partikel, strahlen, muenzen, extras, brocken: zustand.brocken };
    effekteBauen();
    schilderBauen();
    groesse();
    if (!zustand.gebaut) {
      // Beim ersten Mal fliegt die Kamera von oben in die Stadt
      zustand.gebaut = true;
      zustand.intro = RUHIG ? 0 : 3.2;
      zustand.radius = RUHIG ? zustand.sollRadius : zustand.sollRadius * 2.3;
      zustand.azimut = RUHIG ? zustand.sollAzimut : zustand.sollAzimut + 1.5;
      zustand.polar = RUHIG ? zustand.sollPolar : 0.42;
    }
    if (zustand.offen) { const id = zustand.offen; zustand.offen = null; oeffnen(id, false); }
    wecken(3500);
  }

  // ---------- Schilder über den Häusern ----------
  function schildInhalt(a) {
    const st = stufeVon(a);
    const zusatz = a.status === "lebt" ? esc(geld(a.vermoegen)) : (a.status === "tot" ? "tot" : "im Bau");
    return `<i style="background:var(--${st})"></i>${esc(kurz(a.name || a.id, 14))} <b>${zusatz}</b>`;
  }
  function schildText(a) {
    const st = stufeVon(a);
    return `${a.name || a.id}, ${STUFEN[st]}${a.status === "lebt" ? ", Vermögen " + geld(a.vermoegen) : ""}. Antippen zum Hineinschauen`;
  }
  function schilderBauen() {
    const fokusEl = document.activeElement;
    const fokusId = fokusEl && schilderEbene.contains(fokusEl) ? fokusEl.getAttribute("data-id") : null;
    const rang = { lebt: 0, ungeboren: 1, tot: 2 };
    const liste = zustand.agenten.filter(a => stadt.haeuser[a.id]).slice()
      .sort((x, y) => ((rang[x.status] || 0) - (rang[y.status] || 0)) || ((Number(y.vermoegen) || 0) - (Number(x.vermoegen) || 0)));
    schilderEbene.innerHTML = '<button type="button" class="d3-schild d3-rathaus" data-id="rathaus" aria-label="Rathaus, das Gehirn der Stadt. Antippen für mehr">Rathaus</button>' +
      liste.map(a => `<button type="button" class="d3-schild" data-id="${esc(a.id)}" aria-label="${esc(schildText(a))}">${schildInhalt(a)}</button>`).join("");
    const tote = new Set(liste.filter(a => a.status === "tot").map(a => a.id));
    zustand.schilder = Array.prototype.map.call(schilderEbene.children, knopf => {
      const id = knopf.getAttribute("data-id");
      return { id, knopf, b: 0, h: 0, tot: tote.has(id) };
    });
    if (fokusId) {
      const neu = zustand.schilder.find(s => s.id === fokusId);
      if (neu) neu.knopf.focus({ preventScroll: true });
    }
  }
  function schilderAktualisieren() {
    const nachId = {};
    zustand.agenten.forEach(a => { nachId[a.id] = a; });
    zustand.schilder.forEach(s => {
      const a = nachId[s.id];
      if (!a) return;
      const inhalt = schildInhalt(a);
      if (s.knopf.innerHTML !== inhalt) { s.knopf.innerHTML = inhalt; s.b = 0; }
      s.knopf.setAttribute("aria-label", schildText(a));
    });
  }

  const hilfsVektor = new THREE.Vector3();
  function bildschirm(x, y, z, b, h) {
    hilfsVektor.set(x, y, z).project(kamera);
    return { x: (hilfsVektor.x + 1) / 2 * b, y: (1 - hilfsVektor.y) / 2 * h, sichtbar: hilfsVektor.z < 1 && Math.abs(hilfsVektor.x) < 1.2 && Math.abs(hilfsVektor.y) < 1.2 };
  }
  function ankerVon(id) {
    if (id === "rathaus") return [0, 36.2, 0];
    const t = stadt && stadt.haeuser[id];
    return t ? [t.ort.x, t.hoehe + 1.4 + (t.ueberDach || 0), t.ort.z] : null;   // über der Münze, falls eine schwebt
  }
  function schilderSetzen() {
    if (!stadt) return;
    const B = leinwandEl.clientWidth, H = leinwandEl.clientHeight, belegt = [];
    // Oben links liegt auf breiten Bildschirmen die Glaskarte der Seite: dort nichts hinlegen, sonst verdeckt sie es
    const freiH = Number(behaelter.dataset.obenFreiH) || 0, freiB = Number(behaelter.dataset.obenFreiB) || 0;
    if (freiH > 0 && freiB > 0) belegt.push({ l: 0, r: freiB, o: 0, u: freiH });
    const obenMin = freiH > 0 ? freiH + 8 : 8;
    if (!blase.hidden && zustand.offen) {
      const anker = ankerVon(zustand.offen);
      if (anker) {
        const p = bildschirm(anker[0], anker[1], anker[2], B, H);
        if (!zustand.blaseB) { zustand.blaseB = blase.offsetWidth; zustand.blaseH = blase.offsetHeight; }
        const bw = zustand.blaseB, bh = zustand.blaseH;
        // Platz über dem Haus: dort hin. Sonst daneben. Auf dem Handy unten über den Knöpfen.
        let links, oben, art = "oben";
        if (B < 600) { art = "unten"; links = 12; oben = Math.max(8, H - bh - 60); }
        else if (p.y - 34 - bh >= obenMin) { links = klemmen(p.x - bw / 2, 8, Math.max(8, B - bw - 8)); oben = p.y - 34 - bh; }
        else {
          art = "seitlich";
          oben = klemmen(p.y - 12, obenMin, Math.max(obenMin, H - bh - 60));
          links = p.x + 80 + bw <= B - 8 ? p.x + 80 : Math.max(8, p.x - 80 - bw);
        }
        blase.classList.toggle("ohne-zipfel", art !== "oben");
        blase.style.transform = `translate(${links.toFixed(1)}px, ${oben.toFixed(1)}px)`;
        blase.style.setProperty("--zipfel", `${klemmen(p.x - links, 18, bw - 18).toFixed(1)}px`);
        blase.style.visibility = p.sichtbar ? "visible" : "hidden";
        if (p.sichtbar) belegt.push({ l: links, r: links + bw, o: oben, u: oben + bh });
      }
    }
    const zuerst = ["rathaus", zustand.gewaehlt, zustand.hover];
    const reihe = zustand.schilder.slice().sort((x, y) => {
      const px = zuerst.indexOf(x.id), py = zuerst.indexOf(y.id);
      return (px < 0 ? 9 : px) - (py < 0 ? 9 : py);
    });
    for (const s of reihe) {
      const anker = ankerVon(s.id);
      if (!anker) { s.knopf.style.visibility = "hidden"; continue; }
      const p = bildschirm(anker[0], anker[1], anker[2], B, H);
      if (!s.b) { s.b = s.knopf.offsetWidth; s.h = s.knopf.offsetHeight; }
      const rect = { l: p.x - s.b / 2, r: p.x + s.b / 2, o: p.y - s.h, u: p.y };
      let zeigen = p.sichtbar && rect.r > 0 && rect.l < B && rect.u > 0 && rect.o < H;
      const wichtig = s.id === "rathaus" || s.id === zustand.gewaehlt || s.id === zustand.hover;
      const stoesst = r => belegt.some(q => r.l < q.r + 3 && r.r > q.l - 3 && r.o < q.u + 2 && r.u > q.o - 2);
      if (zeigen && wichtig) {   // wichtige Schilder ganz ins Bild schieben, statt sie abzuschneiden
        const dx = klemmen(rect.l, 2, Math.max(2, B - s.b - 2)) - rect.l;
        rect.l += dx; rect.r += dx;
        // Zwei wichtige Schilder (Rathaus und gewählter Agent) dürfen sich nicht verdecken: dann nach oben oder unten ausweichen
        if (stoesst(rect)) {
          for (const dy of [-(s.h + 6), s.h + 6, -2 * (s.h + 6), 2 * (s.h + 6)]) {
            const versuch = { l: rect.l, r: rect.r, o: rect.o + dy, u: rect.u + dy };
            if (versuch.o >= 2 && versuch.u <= H - 2 && !stoesst(versuch)) { Object.assign(rect, versuch); break; }
          }
        }
      } else if (zeigen && (rect.l < 2 || rect.r > B - 2 || rect.o < 0)) zeigen = false;   // halb abgeschnitten: lieber weglassen
      if (zeigen && !wichtig && s.tot && zustand.schilder.length > 13) zeigen = false;   // große Stadt: Platz für die Lebenden
      if (zeigen && !wichtig) zeigen = !belegt.some(q => rect.l < q.r + 3 && rect.r > q.l - 3 && rect.o < q.u + 2 && rect.u > q.o - 2);
      if (zeigen) belegt.push(rect);
      s.knopf.style.transform = `translate(${rect.l.toFixed(1)}px, ${rect.o.toFixed(1)}px)`;
      s.knopf.style.visibility = zeigen ? "visible" : "hidden";
      s.knopf.classList.toggle("gewaehlt", s.id === zustand.gewaehlt);
      s.knopf.classList.toggle("hover", s.id === zustand.hover);
    }
  }

  // ---------- Haus öffnen und hineinschauen ----------
  function blaseFuellen() {
    const id = zustand.offen;
    if (!id) return;
    let text = "";
    if (id === "rathaus") {
      const info = (zustand.info && zustand.info.rathaus) || {};
      const lebend = zustand.agenten.filter(x => x.status === "lebt").length;
      let was;
      if (info.beendet) was = "Variante A ist beendet, das Rathaus ruht. Einrichten.command startet die Stadt wieder.";
      else if (info.stopp) was = "Die Stadt ist angehalten: Die Agenten ruhen, das Rathaus wacht weiter über Geld und Telegram. /start lässt sie weiterlaufen.";
      else if (info.probemodus && info.topf) was = `Überlebensmodus: Läuft alle ${info.variante === "MacBook" ? 5 : 15} Minuten. ` +
        `Alle Agenten leben aus einem gemeinsamen Topf, gerade ${geld(info.topf.stand)} von ${geld(info.topf.start)}. ` +
        "Ihre Kosten ziehen ab, Einnahmen kommen dazu. Ist er leer, sterben alle endgültig.";
      else if (info.probemodus) was = `Probemodus: Läuft alle ${info.variante === "MacBook" ? 5 : 15} Minuten. Die Agenten arbeiten ohne Startgeld, ` +
        "ohne Miete, ohne Sterben, ohne Kinder und ohne Zahlungen. Die Kosten trägst du über dein API-Guthaben.";
      else was = `Läuft alle ${info.variante === "MacBook" ? 5 : 15} Minuten: zieht die echten Kosten ab, zahlt dir die Miete, ` +
        "führt die Aufträge der Agenten aus und fragt dich bei fremden Zahlungen. Nur das Rathaus bewegt Geld.";
      text = `<b>Rathaus, das Gehirn der Stadt</b><span>${esc(was)}</span>` +
        `<span class="leise">${lebend} ${lebend === 1 ? "Agent lebt" : "Agenten leben"}.</span>`;
    } else {
      const a = zustand.agenten.find(x => x.id === id);
      if (!a) return;
      const name = esc(a.name || a.id);
      const vt = stadt && stadt.verteilung;
      const familie = vt && vt.familieVon[a.id];
      const gruender = familie && zustand.agenten.find(x => x.id === familie);
      const viertel = gruender ? `<span class="leise"><i class="d3-viertel" style="background:${familienFarbe(vt, familie)}"></i>Viertel von ${esc(gruender.name || gruender.id)}</span>` : "";
      if (a.status === "tot") text = `<b>${name}</b><span>Gestorben: ${esc(a.todesursache || "Geld aufgebraucht")}</span>` + viertel;
      else if (a.status === "ungeboren") text = `<b>${name}</b><span>${a.wartet ? "Ruht nach der Probezeit, wartet auf sein Startgeld." : "Im Bau. Wartet auf sein Startgeld."}</span>` + viertel;
      else text = `<b>${name}</b><span>Gerade: ${esc(kurz(a.aktuell || "nichts eingetragen", 140))}</span>` +
        (a.geschaeft ? `<span class="leise">Geschäft: ${esc(kurz(a.geschaeft, 110))}</span>` : "") + viertel;
    }
    blase.innerHTML = '<button type="button" class="d3-zu" aria-label="Schließen">×</button>' + text +
      '<button type="button" class="d3-mehr">Ganze Akte</button>';
    blase.hidden = false;
    zustand.blaseB = 0;
  }
  function oeffnen(id, kameraMit) {
    if (!stadt) return;
    if (zustand.offen && zustand.offen !== id) schliessen();
    zustand.offen = id;
    if (id === "rathaus") {
      if (kameraMit) fokus(0, 13, 0, 72);
    } else {
      const teile = stadt.haeuser[id];
      if (!teile) { zustand.offen = null; return; }
      if (teile.innen && !teile.innenGruppe) {
        teile.innenGruppe = teile.innen();
        teile.haus.add(teile.innenGruppe);
      }
      // Wände und Dach werden durchsichtig, dann sieht man hinein
      teile.fassaden.forEach(m => { m.transparent = true; m.opacity = 0.14; m.depthWrite = false; m.needsUpdate = true; });
      teile.daecher.forEach(m => { m.transparent = true; m.opacity = 0.22; m.depthWrite = false; m.needsUpdate = true; });
      if (kameraMit) {
        zustand.sollPolar = Math.min(zustand.grundPolar, 0.82);   // etwas steiler, dann sieht man besser hinein
        fokus(teile.ort.x, Math.max(2, teile.hoehe * 0.3), teile.ort.z, Math.max(36, teile.hoehe * 2.7 + 24));
      }
    }
    blaseFuellen();
    wecken(2500);
  }
  function schliessen() {
    if (!stadt || !zustand.offen) { blase.hidden = true; return; }
    const teile = stadt.haeuser[zustand.offen];
    if (teile) {
      if (teile.innenGruppe) { teile.haus.remove(teile.innenGruppe); entsorgen(teile.innenGruppe); teile.innenGruppe = null; }
      const deckend = stadt.thema.fuellung >= 1;
      [...teile.fassaden, ...teile.daecher].forEach(m => {
        m.transparent = !deckend; m.opacity = deckend ? 1 : stadt.thema.fuellung; m.depthWrite = deckend; m.needsUpdate = true;
      });
    }
    zustand.offen = null;
    blase.hidden = true;
    wecken();
  }

  // ---------- Kamera ----------
  // Kleinster Abstand, bei dem die Stadt und die Turmspitze ganz ins Bild passen (im Hochformat etwas enger)
  const pruefKamera = new THREE.PerspectiveCamera(32, 1, 1, 2000), pruefPunkt = new THREE.Vector3();
  function grundRadiusBerechnen() {
    const hochformat = kamera.aspect < 0.9;
    const schwebend = stadt && stadt.thema.schwebend;
    // Schwebt die Insel, soll man sie ganz sehen, mit einem Teil des Felsens darunter
    const w = schwebend ? (zustand.weite + 9) * (hochformat ? 0.93 : 0.88) : zustand.weite * (hochformat ? 0.72 : 0.86);
    const punkte = [[w, 0, w], [-w, 0, w], [w, 0, -w], [-w, 0, -w], [0, 37.5, 0]];
    if (schwebend) punkte.push([0, -(zustand.weite + 9) * 0.35, 0]);
    pruefKamera.fov = kamera.fov; pruefKamera.aspect = kamera.aspect; pruefKamera.updateProjectionMatrix();
    const p = zustand.grundPolar, az = zustand.sollAzimut, zy = zustand.zielY;
    let unten = 30, oben = 700;
    for (let i = 0; i < 24; i++) {
      const r = (unten + oben) / 2;
      pruefKamera.position.set(r * Math.sin(p) * Math.sin(az), zy + r * Math.cos(p), r * Math.sin(p) * Math.cos(az));
      pruefKamera.lookAt(0, zy, 0);
      pruefKamera.updateMatrixWorld();
      const passt = punkte.every(([x, y, z]) => { pruefPunkt.set(x, y, z).project(pruefKamera); return Math.abs(pruefPunkt.x) <= 0.96 && Math.abs(pruefPunkt.y) <= 0.9; });
      if (passt) oben = r; else unten = r;
    }
    return oben;
  }
  function fokus(x, y, z, radius) {
    zustand.sollZiel.set(x, y, z);
    zustand.sollRadius = klemmen(radius, 22, zustand.grundRadius * 1.7);
    zustand.fokus = true;
    wecken(3000);
  }
  function uebersicht() {
    zustand.sollZiel.set(0, zustand.zielY, 0);
    zustand.sollPolar = zustand.grundPolar;
    zustand.polarManuell = false;
    zustand.sollRadius = zustand.grundRadius;
    zustand.fokus = false;
    wecken(3000);
  }
  function kameraSetzen(dt) {
    // Anflug beim Start: langsamer und weicher als normale Kamerafahrten
    if (zustand.intro > 0) zustand.intro = Math.max(0, zustand.intro - dt);
    // Lässt man die Stadt in Ruhe, kreist die Kamera langsam um sie herum
    if (!RUHIG && !zustand.offen && !zustand.fokus && zustand.intro <= 0 && performance.now() - zustand.bedient > 9000 && !zeiger.size) {
      zustand.sollAzimut += dt * 0.045;
    }
    const k = RUHIG ? 1 : 1 - Math.pow(zustand.intro > 0 ? 0.25 : 0.002, dt);
    zustand.azimut += (zustand.sollAzimut - zustand.azimut) * k;
    zustand.polar += (zustand.sollPolar - zustand.polar) * k;
    zustand.radius += (zustand.sollRadius - zustand.radius) * k;
    zustand.ziel.lerp(zustand.sollZiel, k);
    const r = zustand.radius, p = zustand.polar, z = zustand.ziel;
    kamera.position.set(z.x + r * Math.sin(p) * Math.sin(zustand.azimut), z.y + r * Math.cos(p), z.z + r * Math.sin(p) * Math.cos(zustand.azimut));
    kamera.lookAt(z);
  }

  // ---------- Bedienung ----------
  const raycaster = new THREE.Raycaster(), maus = new THREE.Vector2();
  function treffer(clientX, clientY) {
    if (!stadt) return null;
    const box = leinwandEl.getBoundingClientRect();
    maus.set((clientX - box.left) / box.width * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(maus, kamera);
    const t = raycaster.intersectObjects(stadt.picks, false)[0];
    return t ? t.object.userData.id : null;
  }
  function hilfeWeg() { if (!hilfe.hidden) hilfe.hidden = true; }
  function auswaehlen(id) { hilfeWeg(); if (optionen.beiAuswahl) optionen.beiAuswahl(id); else oeffnen(id, true); }

  const zeiger = new Map();
  let start = null, abstandStart = 0, radiusStart = 0, gezogen = false;
  leinwandEl.addEventListener("pointerdown", e => {
    zustand.bedient = performance.now(); zustand.intro = 0;
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { leinwandEl.setPointerCapture(e.pointerId); } catch (f) { /* egal */ }
    if (zeiger.size === 1) start = { x: e.clientX, y: e.clientY, azimut: zustand.sollAzimut, polar: zustand.sollPolar, zeit: performance.now(), maus: e.pointerType !== "touch" };
    gezogen = zeiger.size > 1;
    if (zeiger.size === 2) {
      const [p1, p2] = [...zeiger.values()];
      abstandStart = Math.hypot(p1.x - p2.x, p1.y - p2.y); radiusStart = zustand.sollRadius;
    }
    wecken();
  });
  leinwandEl.addEventListener("pointermove", e => {
    if (zeiger.has(e.pointerId)) {
      zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (zeiger.size === 2) {
        const [p1, p2] = [...zeiger.values()];
        const abstand = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (abstandStart > 10 && abstand > 10) zustand.sollRadius = klemmen(radiusStart * abstandStart / abstand, 22, zustand.grundRadius * 1.7);
      } else if (start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) gezogen = true;
        if (gezogen) {
          zustand.sollAzimut = start.azimut - dx * 0.008;
          if (start.maus && Math.abs(dy) > 6) { zustand.sollPolar = klemmen(start.polar - dy * 0.004, 0.55, 1.2); zustand.polarManuell = true; }
          hilfeWeg();
        }
      }
      wecken();
    } else if (e.pointerType === "mouse") {
      const id = treffer(e.clientX, e.clientY);
      if (id !== zustand.hover) { zustand.hover = id; leinwandEl.style.cursor = id ? "pointer" : "grab"; wecken(); }
    }
  });
  leinwandEl.addEventListener("pointerup", e => {
    const war = zeiger.get(e.pointerId);
    zeiger.delete(e.pointerId);
    if (war && start && !gezogen && zeiger.size === 0 && performance.now() - start.zeit < 650) {
      const id = treffer(e.clientX, e.clientY);
      if (id) auswaehlen(id);
      else if (zustand.offen || zustand.fokus) { schliessen(); uebersicht(); }
    }
    if (zeiger.size === 0) start = null;
  });
  leinwandEl.addEventListener("pointercancel", e => { zeiger.delete(e.pointerId); if (zeiger.size === 0) start = null; });
  leinwandEl.addEventListener("pointerleave", () => { if (zustand.hover && !zeiger.size) { zustand.hover = null; wecken(); } });
  leinwandEl.addEventListener("wheel", e => {
    if (!(e.ctrlKey || e.metaKey)) {
      if (zustand.tippZahl < 3) {
        zustand.tippZahl++;
        tipp.textContent = "Zum Zoomen Strg (am Mac ⌘) gedrückt halten oder die Plus- und Minus-Knöpfe nehmen.";
        tipp.hidden = false;
        clearTimeout(tipp._zeit);
        tipp._zeit = setTimeout(() => { tipp.hidden = true; }, 2200);
      }
      return;
    }
    e.preventDefault();
    zustand.bedient = performance.now(); zustand.intro = 0;
    zustand.sollRadius = klemmen(zustand.sollRadius * (e.deltaY > 0 ? 1.12 : 0.89), 22, zustand.grundRadius * 1.7);
    wecken();
  }, { passive: false });
  huelle.addEventListener("keydown", e => {
    const tasten = { ArrowLeft: "links", ArrowRight: "rechts", "+": "rein", "=": "rein", "-": "raus", Home: "mitte", Escape: "mitte" };
    if (!tasten[e.key] || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    knopf(tasten[e.key]);
  });
  leinwandEl.addEventListener("webglcontextlost", e => { e.preventDefault(); zustand.verloren = true; effekteBauen(); });
  leinwandEl.addEventListener("webglcontextrestored", () => { zustand.verloren = false; aufbauen(); });
  huelle.querySelector(".d3-knoepfe").addEventListener("click", e => {
    const b = e.target.closest("button[data-knopf]");
    if (b) knopf(b.getAttribute("data-knopf"));
  });
  schilderEbene.addEventListener("click", e => {
    const b = e.target.closest("button[data-id]");
    if (b) auswaehlen(b.getAttribute("data-id"));
  });
  blase.addEventListener("click", e => {
    if (e.target.closest(".d3-zu")) { schliessen(); uebersicht(); leinwandEl.focus({ preventScroll: true }); }
    else if (e.target.closest(".d3-mehr") && optionen.beiAkte) optionen.beiAkte(zustand.offen);
  });
  function knopf(name) {
    hilfeWeg();
    zustand.bedient = performance.now(); zustand.intro = 0;
    if (name === "links") zustand.sollAzimut += Math.PI / 4;
    if (name === "rechts") zustand.sollAzimut -= Math.PI / 4;
    if (name === "rein") zustand.sollRadius = Math.max(22, zustand.sollRadius * 0.8);
    if (name === "raus") zustand.sollRadius = Math.min(zustand.grundRadius * 1.7, zustand.sollRadius * 1.25);
    if (name === "mitte") { schliessen(); uebersicht(); }
    wecken(3000);
  }

  // ---------- Bewegung ----------
  const hilf = new THREE.Vector3();
  function bewegen(dt) {
    if (!stadt) return;
    zustand.zeit += dt;
    const zeit = zustand.zeit, { turm, figuren, autos, thema } = stadt;
    if (!RUHIG) {
      turm.drehung.rotation.y += dt * 0.7;
      turm.drehung2.rotation.y -= dt * 0.35;
      turm.drehung.position.y = 17 + Math.sin(zeit * 0.9) * 1.4;
    }
    zustand.puls = Math.max(0, zustand.puls - dt * 1.2);
    turm.koerperMat.emissiveIntensity = thema.turmLicht * (0.15 + 0.45 * zustand.puls + (RUHIG ? 0 : 0.05 * Math.sin(zeit * 2)));
    turm.licht.scale.setScalar(1 + zustand.puls * 0.9);
    if (turm.strahl) turm.strahl.material.opacity = 0.16 + 0.22 * zustand.puls;
    for (const f of figuren) {
      const kunde = f.modus === "kunde";
      if (RUHIG) {
        f.figur.rotation.y = aufWeg(f.weg, 0, f.figur.position) + Math.PI;
        f.figur.visible = true;
        continue;
      }
      if (f.modus === "spazieren") {
        // Wer gerade nicht arbeitet, geht gemütlich um sein Haus und bleibt ab und zu stehen
        if (f.pause > 0) f.pause -= dt;
        else {
          f.t = (f.t + f.tempo * dt) % f.weg.laenge;
          f.bisPause -= dt;
          if (f.bisPause <= 0) { f.pause = 1.5 + f.rr() * 3; f.bisPause = 5 + f.rr() * 8; }
        }
        f.figur.rotation.y = aufWeg(f.weg, f.t, f.figur.position);
        if (f.pause <= 0) f.figur.position.y += Math.abs(Math.sin(zeit * 6 + f.tempo * 10)) * 0.1;
        continue;
      }
      if (f.pause > 0) {
        f.pause -= dt;
        if (kunde) f.figur.visible = false;   // im Laden oder schon weitergegangen
      } else {
        f.t += f.richtung * f.tempo * dt;
        if (f.t >= f.weg.laenge) { f.t = f.weg.laenge; f.richtung = -1; f.pause = kunde ? 2.5 : 1.6; if (!kunde) zustand.puls = 1; }
        if (f.t <= 0) { f.t = 0; f.richtung = 1; f.pause = kunde ? 3 + (f.tempo * 11) % 5 : 4 + (f.tempo * 7) % 6; }
        if (kunde) f.figur.visible = true;
      }
      const winkel = aufWeg(f.weg, f.t, f.figur.position);
      f.figur.rotation.y = f.richtung > 0 ? winkel : winkel + Math.PI;
      if (f.pause <= 0) f.figur.position.y += Math.abs(Math.sin(zeit * 9 + f.tempo)) * 0.16;
    }
    for (const a of autos) {
      if (!RUHIG) a.t += a.tempo * dt;
      const w = aufRing(a.ring, a.spur, a.t, hilf);
      a.auto.position.copy(hilf);
      a.auto.rotation.y = a.tempo > 0 ? w : w + Math.PI;
    }
    const blinken = RUHIG || Math.sin(zeit * 4) > -0.2;
    stadt.gruppe.traverse(o => { if (o.userData.blinkt) o.visible = blinken; });
    krassBewegen(dt, zeit);
    for (const [id, teile] of Object.entries(stadt.haeuser)) {
      const an = id === zustand.hover || id === zustand.gewaehlt;
      teile.fassaden.forEach(m => { m.emissiveIntensity = thema.fensterLicht * (an ? 1.7 : 1) + (an ? 0.18 : 0); });
    }
  }

  const hilf2 = new THREE.Vector3();
  function krassBewegen(dt, zeit) {
    const { partikel, strahlen, muenzen, extras } = stadt;
    if (!RUHIG) for (const b of stadt.brocken) b.position.y = b.userData.y + Math.sin(zeit * 0.6 + b.userData.phase) * 0.9;
    // Lichtpakete fliegen von den arbeitenden Agenten zum Rathaus; kommt eins an, pulsiert das Rathaus
    for (const s of strahlen) {
      for (const p of s.pakete) {
        if (!RUHIG) {
          p.t += dt * s.tempo;
          if (p.t >= 1) { p.t -= 1; zustand.puls = Math.max(zustand.puls, 0.55); }
        }
        s.kurve.getPoint(p.t, hilf2);
        p.p.position.copy(hilf2);
        p.p.scale.setScalar(0.8 + Math.sin(p.t * Math.PI) * 0.6);
      }
    }
    for (const m of muenzen) {
      if (RUHIG) continue;
      m.muenze.rotation.y = zeit * 1.6 + m.phase;
      m.muenze.position.y = m.y + Math.sin(zeit * 1.8 + m.phase) * 0.35;
    }
    if (extras) {
      // Herzschlag: alle drei Sekunden läuft eine Welle über den Platz
      zustand.welle = RUHIG ? 0.5 : (zustand.welle + dt / 3) % 1;
      const w = zustand.welle;
      extras.welle.scale.setScalar(5.6 + w * 22);
      extras.welle.material.opacity = (1 - w) * 0.55;
      if (!RUHIG) extras.kreis.rotation.y += dt * 0.5;
    }
    if (!partikel || RUHIG) return;
    if (partikel.art === "wolken") {
      for (const wolke of partikel.wolken) {
        wolke.userData.winkel += dt * wolke.userData.tempo;
        wolke.position.x = Math.cos(wolke.userData.winkel) * wolke.userData.abstand;
        wolke.position.z = Math.sin(wolke.userData.winkel) * wolke.userData.abstand;
      }
    } else if (partikel.art === "scan") {
      partikel.scanner.position.y = ((zeit * 3.2) % 34) + 0.2;
      partikel.scanner.children[0].material.opacity = 0.14 * (1 - partikel.scanner.position.y / 40);
    } else if (partikel.art === "regen") {
      const pos = partikel.objekt.geometry.getAttribute("position"), a = pos.array;
      for (let i = 0; i < partikel.anzahl; i++) {
        const o = i * 6;
        let y = a[o + 1] - dt * 46;
        if (y < 0) y += partikel.hoehe;
        a[o + 1] = y; a[o + 4] = y - 1.6;
      }
      pos.needsUpdate = true;
    } else {
      // Glühwürmchen: schweben langsam auf und ab
      const pos = partikel.objekt.geometry.getAttribute("position"), a = pos.array, basis = partikel.objekt.userData.basis;
      for (let i = 0; i < partikel.anzahl; i++) {
        const o = i * 3;
        a[o] = basis[o] + Math.sin(zeit * 0.4 + i) * 0.8;
        a[o + 1] = basis[o + 1] + Math.sin(zeit * 0.7 + i * 1.7) * 0.9;
        a[o + 2] = basis[o + 2] + Math.cos(zeit * 0.35 + i * 0.6) * 0.8;
      }
      pos.needsUpdate = true;
      partikel.objekt.material.opacity = 0.6 + Math.sin(zeit * 1.3) * 0.2;
    }
  }

  // ---------- Bildschleife: 30 Bilder pro Sekunde reichen, beim Bedienen mehr ----------
  let letzte = 0, letztesBild = 0, aktivBis = 0;
  function wecken(ms) {
    aktivBis = Math.max(aktivBis, performance.now() + (ms || 1500));
    if (!zustand.laeuft && zustand.sichtbar && document.visibilityState !== "hidden") {
      zustand.laeuft = true;
      requestAnimationFrame(bild);
    }
  }
  function bild(jetzt) {
    zustand.laeuft = false;
    if (!zustand.sichtbar || document.visibilityState === "hidden") return;
    const interaktiv = jetzt < aktivBis;
    if (interaktiv || jetzt - letztesBild >= 33) {
      const dt = Math.min(0.05, Math.max(0, (jetzt - (letzte || jetzt)) / 1000));
      letzte = jetzt; letztesBild = jetzt;
      kameraSetzen(dt);
      bewegen(dt);
      if (!zustand.verloren) {
        if (effekte) effekte.composer.render(dt); else renderer.render(szene, kamera);
      }
      schilderSetzen();
    }
    if (RUHIG && !interaktiv) { letzte = 0; return; }   // reduzierte Bewegung: nur zeichnen, wenn etwas passiert
    zustand.laeuft = true;
    requestAnimationFrame(bild);
  }

  function groesse() {
    const b = Math.max(200, behaelter.clientWidth), h = Math.max(260, huelle.clientHeight || 420);
    const thema = THEMEN[themaSchluessel()];
    // Mit Leuchten auf dem Handy etwas weniger Pixel: sieht gleich aus, schont aber Akku und Grafikchip
    renderer.setPixelRatio(thema.pixel < 1 ? Math.max(thema.pixel, Math.min(0.7, 240 / b)) : Math.min(b < 600 && thema.bloom ? 1.75 : 2, window.devicePixelRatio || 1));
    renderer.setSize(b, h, false);
    if (effekte) { effekte.composer.setPixelRatio(renderer.getPixelRatio()); effekte.composer.setSize(b, h); }
    kamera.aspect = b / h;
    kamera.fov = b < 600 ? 40 : 32;
    kamera.updateProjectionMatrix();
    const hochformat = kamera.aspect < 0.9;
    const altGrund = zustand.grundRadius;
    // Quer eher flach (die Insel wirkt räumlich), hoch eher von oben (dann füllt die Insel das schmale Bild)
    zustand.grundPolar = hochformat ? 0.8 : 1.04;
    zustand.zielY = hochformat ? 2 : 4;
    if (!zustand.fokus) {
      zustand.sollZiel.set(0, zustand.zielY, 0);
      if (!zustand.polarManuell) zustand.sollPolar = zustand.grundPolar;
    }
    zustand.grundRadius = grundRadiusBerechnen();
    if (szene.fog) { szene.fog.near = zustand.grundRadius * 0.9 + 30; szene.fog.far = zustand.grundRadius + 460; }
    if (!zustand.gebaut || !altGrund) zustand.sollRadius = zustand.grundRadius;
    else if (!zustand.fokus) {
      // Selbst gezoomt? Dann bleibt der Ausschnitt, auch wenn die Stadt wächst oder neue Daten kommen.
      const verhaeltnis = zustand.grundRadius / altGrund;
      zustand.sollRadius = klemmen(zustand.sollRadius * verhaeltnis, 22, zustand.grundRadius * 1.7);
      zustand.radius *= verhaeltnis;
    }
    zustand.blaseB = 0;
    zustand.schilder.forEach(s => { s.b = 0; });
    wecken();
  }

  if ("ResizeObserver" in window) new ResizeObserver(() => groesse()).observe(behaelter);
  else window.addEventListener("resize", groesse);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(eintraege => {
      zustand.sichtbar = eintraege.some(e => e.isIntersecting);
      if (zustand.sichtbar) wecken();
    }).observe(behaelter);
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "hidden") wecken(); });
  // Hell/Dunkel gewechselt: Planspiel wird zur Abendstadt und zurück
  const themaPruefen = () => { if (stadt && themaSchluessel() !== stadt.schluessel) aufbauen(); };
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", themaPruefen);
  }
  if ("MutationObserver" in window) new MutationObserver(themaPruefen).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function signatur(agenten) {
    return JSON.stringify(agenten.map(a => [a.id, a.name, a.status, stufeVon(a), Math.round(hausHoehe(a) * 4), aktiv(a),
      a.eltern || "", (a.kinder || []).join(","), symbolFuer(a), kundenZahl(a)]));
  }

  return {
    daten(agenten, info) {
      zustand.info = info || {};
      zustand.agenten = (agenten || []).filter(a => a && typeof a.id === "string");
      leinwandEl.setAttribute("aria-label", `Die Stadt in 3D: ${zustand.agenten.length} Häuser, in der Mitte das Rathaus. Die Häuser sind darüber als Knöpfe erreichbar.`);
      const neu = signatur(zustand.agenten);
      if (neu !== zustand.signatur || !stadt) { zustand.signatur = neu; aufbauen(); }
      else { schilderAktualisieren(); if (zustand.offen) blaseFuellen(); wecken(); }
    },
    design(name) {
      if (!THEMEN[name] || name === zustand.design) return;
      zustand.design = name;
      if (stadt) aufbauen();
    },
    waehle(id, kameraMit) {
      zustand.gewaehlt = id || null;
      if (id && kameraMit) oeffnen(id, true);
      else if (zustand.offen && zustand.offen !== id) schliessen();
      wecken();
    },
    groesse
  };
}

window.Stadt3D = { starten };
window.dispatchEvent(new Event("stadt3d-bereit"));
