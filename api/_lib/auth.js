const crypto = require("crypto");
const { httpError } = require("./http");

const SESSION_DAYS = 30;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };
const DUMMY_HASH = "scrypt$deadbeefdeadbeefdeadbeefdeadbeef$" + "0".repeat(128);

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_OPTS, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const key = await scryptAsync(password, salt);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

const attempts = new Map();

function allowRequest(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 60000);
  if (list.length >= 20) return false;
  list.push(now);
  attempts.set(key, list);
  return true;
}

async function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.query(
    "DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()",
    [userId]
  );
  await db.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashToken(token), userId, expires]
  );
  return { token, expires };
}

async function deleteSession(db, token) {
  if (!token || !db) return;
  await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

function setSessionCookie(res, token, expires) {
  const maxAge = Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000));
  res.setHeader(
    "Set-Cookie",
    `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
}

async function sessionUser(db, req) {
  const token = parseCookies(req.headers.cookie || "").session;
  if (!token) return null;
  const { rows } = await db.query(
    `SELECT u.id, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] || null;
}

async function requireUser(db, req) {
  const user = await sessionUser(db, req);
  if (!user) throw httpError(401, "Non connecté.");
  return user;
}

module.exports = {
  hashPassword,
  verifyPassword,
  parseCookies,
  clientIp,
  allowRequest,
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  sessionUser,
  requireUser,
  DUMMY_HASH,
};