import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "liste_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const MIN_PASSWORD_LENGTH = 12;

function adminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return password.length >= MIN_PASSWORD_LENGTH ? password : null;
}

export function adminConfigured(): boolean {
  return adminPassword() !== null;
}

export const ADMIN_SETUP_HINT =
  `Yönetim paneli kapalı: .env.local dosyasında en az ${MIN_PASSWORD_LENGTH} karakterlik ADMIN_PASSWORD tanımlayın ve sunucuyu yeniden başlatın.`;

/** Signing key. Changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) invalidates every session. */
function signingKey(password: string): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return createHash("sha256").update("liste-admin-session\0" + (secret && secret.length >= 32 ? secret : password)).digest();
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function passwordMatches(candidate: string): boolean {
  const password = adminPassword();
  if (!password) return false;
  return timingSafeEqual(sha256(candidate), sha256(password));
}

function sign(payload: string, password: string): string {
  return createHmac("sha256", signingKey(password)).update(payload).digest("base64url");
}

function createToken(password: string): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload, password)}`;
}

function tokenValid(token: string | undefined): boolean {
  const password = adminPassword();
  if (!password || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isInteger(expires) || expires * 1000 < Date.now()) return false;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(payload, password));
  const given = Buffer.from(parts[3]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return tokenValid(store.get(SESSION_COOKIE)?.value);
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
}

export async function startSession(): Promise<void> {
  const password = adminPassword();
  if (!password) return;
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/* ------------------------------------------------------------------------------------------------
 * Login throttling (in-process, single server instance).
 *
 * - Rolling window: a bucket locks when it has MAX_FAILURES failures whose timestamps all fall
 *   within the last WINDOW_MS (true sliding window, not a fixed window started by the first failure).
 * - Lock: LOCK_MS from the failure that triggered it; failures are cleared when the lock is set.
 * - Buckets: one per client. The client is identified by IP ONLY when a trusted reverse-proxy
 *   boundary is configured (ADMIN_TRUSTED_PROXY_HOPS). Otherwise every request uses one shared
 *   bucket, because Next.js only fills X-Forwarded-For when the client did not send one
 *   (`??=` in next/dist/server/base-server.js), so the header is attacker-controlled on direct access.
 * - State is bounded: expired buckets are swept, and at MAX_BUCKETS new clients share an overflow
 *   bucket (fail closed) instead of evicting existing — possibly locked — buckets.
 * ---------------------------------------------------------------------------------------------- */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_BUCKETS = 5000;
const SWEEP_INTERVAL_MS = 60 * 1000;
const MAX_PROXY_HOPS = 10;
const SHARED_BUCKET = "shared";
const OVERFLOW_BUCKET = "overflow";

type Bucket = { failures: number[]; lockedUntil: number };
type ThrottleState = { buckets: Map<string, Bucket>; lastSweep: number; warnedHops: boolean };

// Kept on globalThis so dev-mode hot reloads do not silently reset counters.
const globalStore = globalThis as typeof globalThis & { __listeAdminLoginThrottle?: ThrottleState };
const throttle: ThrottleState =
  globalStore.__listeAdminLoginThrottle ??
  (globalStore.__listeAdminLoginThrottle = { buckets: new Map(), lastSweep: 0, warnedHops: false });

/**
 * Number of trusted reverse proxies in front of the app (0 = none / direct access, the default).
 * Only set this when the app port is reachable exclusively through those proxies, and each of them
 * appends the address it received the connection from to X-Forwarded-For.
 */
function trustedProxyHops(): number {
  const raw = (process.env.ADMIN_TRUSTED_PROXY_HOPS ?? "").trim();
  if (raw === "" || raw === "0") return 0;
  const hops = Number(raw);
  if (Number.isInteger(hops) && hops >= 1 && hops <= MAX_PROXY_HOPS) return hops;
  if (!throttle.warnedHops) {
    throttle.warnedHops = true;
    console.warn(`ADMIN_TRUSTED_PROXY_HOPS geçersiz (${JSON.stringify(raw)}); 0 kabul edildi (tek ortak deneme sayacı).`);
  }
  return 0;
}

/** Collapse an IPv6 address to its /64 prefix (one end-user allocation); null if malformed. */
function ipv6Prefix64(address: string): string | null {
  let addr = address.split("%")[0].toLowerCase();
  const embedded = addr.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embedded) {
    const o = embedded[1].split(".").map(Number);
    addr = addr.slice(0, -embedded[1].length) + ((o[0] << 8) | o[1]).toString(16) + ":" + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const groups = halves.length === 2 ? [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail] : head;
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":") + "::/64";
}

function normalizeIp(entry: string): string | null {
  let value = entry.trim();
  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) value = bracketed[1];
  const v4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) value = v4WithPort[1];
  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) value = mapped[1];
  const family = isIP(value);
  if (family === 4) return value;
  if (family === 6) return ipv6Prefix64(value);
  return null;
}

/**
 * Throttle bucket for the current request. Returns the shared bucket unless a trusted proxy
 * boundary is configured; then takes the X-Forwarded-For entry appended by the outermost trusted
 * proxy (counting `hops` entries from the right). Entries further left are client-supplied and ignored.
 */
export async function loginClientKey(): Promise<string> {
  const hops = trustedProxyHops();
  if (hops === 0) return SHARED_BUCKET;
  const forwarded = (await headers()).get("x-forwarded-for");
  if (!forwarded) return SHARED_BUCKET;
  const entries = forwarded.split(",");
  if (entries.length < hops) return SHARED_BUCKET;
  const ip = normalizeIp(entries[entries.length - hops]);
  return ip ? `ip:${ip}` : SHARED_BUCKET;
}

function pruneFailures(bucket: Bucket, now: number): void {
  const cutoff = now - WINDOW_MS;
  while (bucket.failures.length && bucket.failures[0] <= cutoff) bucket.failures.shift();
}

function sweep(now: number): void {
  throttle.lastSweep = now;
  for (const [key, bucket] of throttle.buckets) {
    pruneFailures(bucket, now);
    if (bucket.lockedUntil <= now && bucket.failures.length === 0) throttle.buckets.delete(key);
  }
}

/** Map a client key to the bucket key actually used (overflow when the table is full). */
function resolveKey(key: string, now: number): string {
  if (now - throttle.lastSweep >= SWEEP_INTERVAL_MS) sweep(now);
  if (throttle.buckets.has(key) || key === SHARED_BUCKET) return key;
  if (throttle.buckets.size >= MAX_BUCKETS) sweep(now);
  return throttle.buckets.size >= MAX_BUCKETS ? OVERFLOW_BUCKET : key;
}

/** Minutes remaining on this client's lock, or 0 if it may try. */
export function loginLocked(clientKey: string): number {
  const now = Date.now();
  const bucket = throttle.buckets.get(resolveKey(clientKey, now));
  const remaining = bucket ? bucket.lockedUntil - now : 0;
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

export function recordLoginFailure(clientKey: string): void {
  const now = Date.now();
  const key = resolveKey(clientKey, now);
  let bucket = throttle.buckets.get(key);
  if (!bucket) {
    bucket = { failures: [], lockedUntil: 0 };
    throttle.buckets.set(key, bucket);
  }
  pruneFailures(bucket, now);
  bucket.failures.push(now);
  if (bucket.failures.length >= MAX_FAILURES) {
    bucket.lockedUntil = now + LOCK_MS;
    bucket.failures = [];
  }
}

export function recordLoginSuccess(clientKey: string): void {
  throttle.buckets.delete(resolveKey(clientKey, Date.now()));
}
