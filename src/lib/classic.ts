export type Mark = 0 | 1 | null;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function tttWinner(board: Mark[]): { mark: 0 | 1; line: number[] } | null {
  for (const line of TTT_LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a] as 0 | 1, line };
    }
  }
  return null;
}

/** Win, block, then prefer centre/corners. */
export function bestTttMove(board: Mark[], mark: 0 | 1): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const other = (1 - mark) as 0 | 1;
  for (const candidate of [mark, other]) {
    for (const i of empty) {
      const copy = [...board];
      copy[i] = candidate;
      if (tttWinner(copy)?.mark === candidate) return i;
    }
  }
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)] ?? -1;
}

export const C4_ROWS = 6;
export const C4_COLS = 7;

export function emptyConnect4(): Mark[][] {
  return Array.from({ length: C4_ROWS }, () => Array<Mark>(C4_COLS).fill(null));
}

export function c4DropRow(board: Mark[][], col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (board[r][col] === null) return r;
  return -1;
}

export function c4Winner(board: Mark[][], row: number, col: number, mark: 0 | 1): [number, number][] | null {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells: [number, number][] = [[row, col]];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r][c] === mark) {
        cells.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

export function bestC4Move(board: Mark[][], mark: 0 | 1): number {
  const other = (1 - mark) as 0 | 1;
  const valid = Array.from({ length: C4_COLS }, (_, c) => c).filter((c) => c4DropRow(board, c) >= 0);
  for (const candidate of [mark, other]) {
    for (const col of valid) {
      const row = c4DropRow(board, col);
      const copy = board.map((r) => [...r]);
      copy[row][col] = candidate;
      if (c4Winner(copy, row, col, candidate)) return col;
    }
  }
  const weighted = [3, 3, 2, 4, 2, 4, 1, 5, 1, 5, 0, 6].filter((c) => valid.includes(c));
  return weighted[Math.floor(Math.random() * weighted.length)] ?? valid[0] ?? -1;
}

/* ---------- Sliding puzzle: always shuffled by legal moves, so always solvable ---------- */
export function slideNeighbors(index: number, size = 3): number[] {
  const row = Math.floor(index / size), col = index % size;
  const out: number[] = [];
  if (row > 0) out.push(index - size);
  if (row < size - 1) out.push(index + size);
  if (col > 0) out.push(index - 1);
  if (col < size - 1) out.push(index + 1);
  return out;
}

export function buildSolvableSlide(seed: number, size = 3): number[] {
  const rnd = mulberry32(seed + 707);
  const board = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
  let blank = board.length - 1;
  let previous = -1;
  const steps = size === 3 ? 55 : 90;
  for (let i = 0; i < steps; i++) {
    const options = slideNeighbors(blank, size).filter((n) => n !== previous);
    const pick = options[Math.floor(rnd() * options.length)];
    [board[blank], board[pick]] = [board[pick], board[blank]];
    previous = blank;
    blank = pick;
  }
  return board;
}

export function slideSolved(board: number[]): boolean {
  return board.every((v, i) => v === (i + 1) % board.length);
}

/* ---------- Real Wikipedia race presets ---------- */
export const WIKI_ROUTES = [
  { start: "Apple Inc.", target: "IPhone", hint: "Hardware is a good place to look." },
  { start: "Renaissance", target: "Leonardo da Vinci", hint: "Think of a famous polymath." },
  { start: "Coffee", target: "Brazil", hint: "Follow production and exporting countries." },
  { start: "Chess", target: "India", hint: "Look into the history of the game." },
  { start: "Moon", target: "Apollo 11", hint: "Follow human exploration." },
  { start: "Wikipedia", target: "World Wide Web", hint: "Follow its underlying technology." },
  { start: "Bitcoin", target: "Cryptography", hint: "Follow the security mechanism." },
  { start: "Earth", target: "Moon", hint: "Look for our natural satellite." },
  { start: "Cricket", target: "India", hint: "Follow the sport's major playing nations." },
  { start: "Marie Curie", target: "Nobel Prize", hint: "Her awards section is useful." },
];

export interface WikiPage {
  title: string;
  extract: string;
  links: string[];
}

export async function fetchWikiPage(title: string): Promise<WikiPage> {
  // action=parse returns the article's complete internal-link graph in one request;
  // prop=links with a small pllimit would hide targets on long articles.
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "links",
    redirects: "1",
    format: "json",
    origin: "*",
  });
  const r = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(r.status === 429 ? "Wikipedia is rate-limiting requests — wait a few seconds and retry" : "Wikipedia is unavailable");
  const json = await r.json();
  const page = json?.parse;
  if (!page || json.error) throw new Error(json?.error?.info || "Page not found");
  const links = Array.from(new Set<string>((page.links || [])
    .filter((l: any) => Number(l.ns) === 0 && l.exists !== undefined)
    .map((l: any) => String(l["*"]))))
    .filter((l) => l && l !== page.title)
    .sort((a, b) => a.localeCompare(b));
  return {
    title: page.title,
    extract: `${links.length} live internal links loaded from the full article. Open the source to read more, or filter the links below to plan your route.`,
    links,
  };
}