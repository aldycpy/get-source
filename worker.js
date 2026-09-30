// Cloudflare Worker: proxy CORS + deploy ke Vercel (cadangan kalau website tidak di Vercel)
// Kode Worker PRIVAT di akun Cloudflare-mu. Jangan taruh token di app.js / index.html.

// ===== INTI DEPLOY (sama persis di api/deploy.js dan worker.js) =====
const FALLBACK_TOKEN = "4HDooA0rPDo0AJPtRxq4rfSb"; // lebih aman: env VERCEL_TOKEN
const TEAM_ID = "";                                  // isi hanya jika akun Vercel berupa Team
const MAX_BYTES = 3200000, MAX_FILES = 300;
const NAME_RE = /^[a-z0-9][a-z0-9-]{1,50}[a-z0-9]$/;
const RESERVED = ["www", "api", "admin", "vercel", "login", "dashboard", "app", "mail", "support"];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function vname(n) {
  if (typeof n !== "string" || !NAME_RE.test(n) || n.includes("--"))
    return "Project name 3-52 karakter: huruf kecil, angka, dan hyphen (tanpa --), harus diawali dan diakhiri huruf atau angka.";
  if (RESERVED.includes(n)) return "Project name itu reserved, pilih yang lain.";
  return "";
}

async function vercelCore(method, query, body, env) {
  const token = (env && env.VERCEL_TOKEN) || FALLBACK_TOKEN;
  const team = (env && env.VERCEL_TEAM_ID) || TEAM_ID;
  const U = p => "https://api.vercel.com" + p + (team ? (p.includes("?") ? "&" : "?") + "teamId=" + encodeURIComponent(team) : "");
  const H = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  // nama bebas? (belum jadi project di akun ini & subdomain .vercel.app belum dipakai siapa pun)
  const free = async name => {
    const p = await fetch(U("/v9/projects/" + encodeURIComponent(name)), { headers: H });
    if (p.status === 200) return false;
    if (p.status === 401 || p.status === 403) throw new Error("Token Vercel tidak valid atau tidak punya izin");
    try {
      const d = await fetch("https://" + name + ".vercel.app", { redirect: "manual" });
      if (d.status !== 404) return false;
    } catch (e) {}
    return true;
  };

  if (method === "GET") {
    const m = vname(query.check);
    if (m) return [200, { available: false, reason: m }];
    const ok = await free(query.check);
    return [200, { available: ok, reason: ok ? "" : "Project name udah dipakai, coba nama lain." }];
  }

  const project = body.project;
  const bad = vname(project);
  if (bad) return [400, { error: bad }];

  let files = [];
  if (Array.isArray(body.files)) files = body.files;
  else if (body.html) files = [{ file: "index.html", data: String(body.html), encoding: "utf-8" }];
  if (!files.length) return [400, { error: "Nggak ada file yang dikirim" }];
  if (files.length > MAX_FILES) return [400, { error: "Maksimal " + MAX_FILES + " file" }];

  let total = 0; const out = [];
  for (const f of files) {
    const p = String((f && f.file) || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!p || p.includes("..") || p.length > 200) return [400, { error: "Nama file tidak valid: " + p }];
    const encd = f.encoding === "base64" ? "base64" : "utf-8";
    const data = String(f.data == null ? "" : f.data);
    total += encd === "base64" ? data.length * 0.75 : data.length;
    out.push({ file: p, data, encoding: encd });
  }
  if (total > MAX_BYTES) return [413, { error: "File too big, max sekitar 3 MB" }];
  if (!out.some(f => f.file === "index.html")) {
    const h = out.filter(f => /\.html?$/i.test(f.file));
    if (h.length === 1) h[0].file = "index.html";
    else return [400, { error: "index.html nggak ada di file yang diupload" }];
  }

  if (!(await free(project))) return [409, { error: "Project name udah dipakai, coba nama lain." }];

  const r = await fetch(U("/v13/deployments?skipAutoDetectionConfirmation=1"), {
    method: "POST", headers: H,
    body: JSON.stringify({ name: project, target: "production", files: out, projectSettings: { framework: null } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return [502, { error: "Vercel: " + ((j.error && (j.error.message || j.error.code)) || ("HTTP " + r.status)) }];

  // buka akses publik (matikan proteksi login Vercel)
  try { await fetch(U("/v9/projects/" + encodeURIComponent(project)), { method: "PATCH", headers: H, body: JSON.stringify({ ssoProtection: null }) }); } catch (e) {}

  let ready = false, alias = [];
  for (let i = 0; i < 8 && j.id; i++) {
    await sleep(1500);
    try {
      const s = await (await fetch(U("/v13/deployments/" + j.id), { headers: H })).json();
      if (Array.isArray(s.alias)) alias = s.alias;
      if (s.readyState === "READY") { ready = true; break; }
      if (s.readyState === "ERROR" || s.readyState === "CANCELED") return [502, { error: "Build di Vercel gagal (" + s.readyState + ")" }];
    } catch (e) {}
  }
  const want = project + ".vercel.app";
  const host = alias.includes(want) ? want : (alias.find(a => a.endsWith(".vercel.app")) || want);
  return [200, { url: "https://" + host, project, ready }];
}
// ===== AKHIR INTI =====

export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    try {
      const url = new URL(req.url);
      if (url.pathname === "/deploy" || url.pathname === "/api/deploy") {
        let body = {};
        if (req.method === "POST") { try { body = await req.json(); } catch (e) { return json({ error: "Body harus JSON" }, 400); } }
        const [s, o] = await vercelCore(req.method, Object.fromEntries(url.searchParams), body, env);
        return json(o, s);
      }
      const u = url.searchParams.get("url");
      if (!/^https?:\/\//i.test(u || "")) return new Response("URL tidak valid", { status: 400, headers: cors });
      if (req.method === "POST") {
        const host = new URL(u).hostname;
        if (!/(^|\.)vercel\.(sh|com)$/.test(host)) return new Response("Host tidak diizinkan", { status: 403, headers: cors });
        const r = await fetch(u, { method: "POST", headers: { "content-type": req.headers.get("content-type") || "" }, body: req.body });
        return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": r.headers.get("content-type") || "application/json" } });
      }
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0 (SourceCodeTools)" }, redirect: "follow" });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    } catch (e) {
      return json({ error: "Worker error: " + e.message }, 502);
    }
  }
};
