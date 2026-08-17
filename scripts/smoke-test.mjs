const BASE = process.env.BASE_URL || "http://localhost:3000";

let failed = 0;

function check(name, cond, extra = "") {
  const tag = cond ? "OK  " : "FAIL";
  if (!cond) failed++;
  console.log(`${tag} ${name}${extra ? " — " + extra : ""}`);
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch (err) {
    // réponse sans corps (204, etc.)
  }
  return { status: res.status, body, cookies: res.headers.getSetCookie() };
}

function cookieOf(res) {
  const set = res.cookies.find((c) => c.startsWith("session="));
  return set ? set.split(";")[0] : null;
}

async function main() {
  const email = `smoke-${Date.now()}@test.local`;
  const password = "mot-de-passe-test";

  const r1 = await req("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("register → 201", r1.status === 201, JSON.stringify(r1.body));
  const cookie = cookieOf(r1);
  check("cookie de session posé", !!cookie);
  const auth = { Cookie: cookie };

  const r2 = await req("/api/me", { headers: auth });
  check("me → 200 + email", r2.status === 200 && r2.body.user.email === email);

  const dup = await req("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("register doublon → 409", dup.status === 409);

  const bad = await req("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "mauvais-mot-de-passe" }),
  });
  check("login mauvais mot de passe → 401", bad.status === 401);

  const r3 = await req("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("login → 200", r3.status === 200);
  const cookie2 = cookieOf(r3);
  const auth2 = { Cookie: cookie2 };

  const r4 = await req("/api/state", { headers: auth2 });
  check(
    "state → 200, 0 habitude",
    r4.status === 200 && r4.body.habits.length === 0
  );

  const r5 = await req("/api/habits", {
    method: "POST",
    headers: auth2,
    body: JSON.stringify({ name: "Méditer" }),
  });
  check("create habit → 201", r5.status === 201);
  const habitId = r5.body.habit.id;

  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const r6 = await req(`/api/completions/${habitId}/${date}`, {
    method: "PUT",
    headers: auth2,
  });
  check("toggle cocher → 204", r6.status === 204);

  const r7 = await req("/api/state", { headers: auth2 });
  check(
    "state → 1 habitude + 1 coche",
    r7.status === 200 &&
      r7.body.habits.length === 1 &&
      r7.body.completions[`${date}|${habitId}`] === true
  );

  const r8 = await req(`/api/completions/${habitId}/${date}`, {
    method: "DELETE",
    headers: auth2,
  });
  check("toggle décocher → 204", r8.status === 204);

  const r9 = await req("/api/state", { headers: auth2 });
  check(
    "state → coche retirée",
    r9.status === 200 && !r9.body.completions[`${date}|${habitId}`]
  );

  const r10 = await req("/api/habits/00000000-0000-0000-0000-000000000000", {
    method: "DELETE",
    headers: auth2,
  });
  check("delete habit inconnu → 404", r10.status === 404);

  const r11 = await req("/api/habits", {
    method: "POST",
    headers: auth2,
    body: JSON.stringify({ name: "Courir" }),
  });
  check("create 2e habit → 201", r11.status === 201);
  const habit2Id = r11.body.habit.id;

  const r12 = await req(`/api/habits/${habit2Id}`, {
    method: "DELETE",
    headers: auth2,
  });
  check("delete habit → 204", r12.status === 204);

  const r13 = await req("/api/logout", { method: "POST", headers: auth2 });
  check("logout → 200", r13.status === 200);

  const r14 = await req("/api/me", { headers: auth2 });
  check("me après logout → 401", r14.status === 401);

  const r15 = await req("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("re-login → 200", r15.status === 200);
  const auth3 = { Cookie: cookieOf(r15) };

  const r16 = await req("/api/state", { headers: auth3 });
  check(
    "persistance → habit « Méditer » toujours là",
    r16.status === 200 &&
      r16.body.habits.some((h) => h.id === habitId && h.name === "Méditer") &&
      r16.body.habits.length === 1
  );

  console.log(failed === 0 ? "\nTout est OK" : `\n${failed} échec(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Erreur du smoke test :", err.message);
  process.exit(1);
});