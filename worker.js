// ============================================================================
// SEIRALAB ATLAS - SECURE CLOUDFLARE EDGE WORKER & API FIREWALL (worker.js)
// ============================================================================

async function signRoleToken(role, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(role));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  const roleB64 = btoa(role).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${roleB64}.${sigHex}`;
}

async function verifyRoleToken(token, secret) {
  if (!token || !token.includes(".")) return { valid: false, role: "" };
  const [roleB64] = token.split(".");
  try {
    const base64 = roleB64.replace(/-/g, "+").replace(/_/g, "/");
    const role = atob(base64);
    const expected = await signRoleToken(role, secret);
    return { valid: token === expected, role };
  } catch {
    return { valid: false, role: "" };
  }
}

function getCookieToken(cookieHeader) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(/(?:^|;\s*)seiralab_session=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // 1. BLOCK SNOOPING ON BACKEND / CONFIG FILES
    if (
      path.startsWith("/functions") ||
      path.includes("wrangler") ||
      path.endsWith("worker.js") ||
      path.endsWith(".go") ||
      path.endsWith(".mod") ||
      path.includes(".env") ||
      path.includes(".git")
    ) {
      return new Response("Not Found", { status: 404 });
    }

    // 2. PROTECT /api/* ENDPOINTS FROM DIRECT BROWSER URL TYPING & EXTERNAL TOOLS
    if (path.startsWith("/api/")) {
      const secFetchSite = request.headers.get("Sec-Fetch-Site");
      const customHeader = request.headers.get("X-Seiralab-Client");

      // If someone types https://.../api/data directly into the address bar,
      // Sec-Fetch-Dest is 'document' and X-Seiralab-Client is missing -> Block with 404!
      if (
        (secFetchSite && secFetchSite !== "same-origin") ||
        customHeader !== "ATLAS-v1"
      ) {
        return new Response("Not Found", { status: 404 });
      }

      const secret = env.AUTH_SECRET || "seiralab_master_hmac_key_2026_secure";
      const jsonHeaders = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff"
      };

      // --- ENDPOINT A: POST /api/login ---
      if (path === "/api/login" && request.method === "POST") {
        try {
          const { role, password, action } = await request.json();

          if (action === "logout") {
            return new Response(JSON.stringify({ status: "logged_out" }), {
              status: 200,
              headers: {
                ...jsonHeaders,
                "Set-Cookie": "seiralab_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
              }
            });
          }

          const passwords = {
            "Visitor": "",
            "Technical": env.PASS_TECHNICAL || "seiralab2026",
            "Head Technical": env.PASS_HEAD || "seiralabhead",
            "MasterAdmin": env.PASS_ADMIN || "seiralabadmin"
          };

          if (!(role in passwords)) {
            return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: jsonHeaders });
          }

          if (role !== "Visitor" && password !== passwords[role]) {
            return new Response(JSON.stringify({ error: `Invalid password for ${role}` }), { status: 401, headers: jsonHeaders });
          }

          const token = await signRoleToken(role, secret);
          return new Response(JSON.stringify({
            role,
            token,
            message: `Welcome, ${role}`
          }), {
            status: 200,
            headers: {
              ...jsonHeaders,
              // Invisible HttpOnly Cookie (Cannot be read by F12 JavaScript Console)
              "Set-Cookie": `seiralab_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`
            }
          });
        } catch {
          return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: jsonHeaders });
        }
      }

      // --- ENDPOINT B: GET & POST /api/data ---
      if (path === "/api/data") {
        const pat = env.GITHUB_TOKEN || "";
        const owner = env.GITHUB_OWNER || "raizon001";
        const repo = env.GITHUB_REPO || "seiralab-cmms-db";
        const branch = env.GITHUB_BRANCH || "main";
        const filePath = env.GITHUB_FILE_PATH || "data/cmms_db.json";

        if (!pat) {
          return new Response(JSON.stringify({ error: "Server vault not configured" }), { status: 503, headers: jsonHeaders });
        }

        // READ DATABASE
        if (request.method === "GET") {
          const apiURL = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
          const ghRes = await fetch(apiURL, {
            headers: {
              "Authorization": `Bearer ${pat}`,
              "Accept": "application/vnd.github+json",
              "User-Agent": "Seiralab-Atlas-Edge",
              "X-GitHub-Api-Version": "2022-11-28"
            }
          });

          if (ghRes.status === 404) {
            return new Response(JSON.stringify({
              equipmentList: [],
              historyLogs: [],
              toolLogs: [],
              calibrationList: []
            }), { status: 200, headers: { ...jsonHeaders, "X-File-SHA": "init" } });
          }

          if (!ghRes.ok) {
            return new Response(JSON.stringify({ error: "Upstream sync error" }), { status: ghRes.status, headers: jsonHeaders });
          }

          const fileData = await ghRes.json();
          const decodedJson = base64ToUtf8(fileData.content);
          return new Response(decodedJson, {
            status: 200,
            headers: { ...jsonHeaders, "X-File-SHA": fileData.sha }
          });
        }

        // WRITE DATABASE
        if (request.method === "POST") {
          const cookieToken = getCookieToken(request.headers.get("Cookie"));
          const bearerToken = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
          const activeToken = cookieToken || bearerToken;

          const { valid, role } = await verifyRoleToken(activeToken, secret);
          if (!valid || role === "Visitor") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: jsonHeaders });
          }

          const rawBody = await request.text();
          const commitMsg = request.headers.get("X-Commit-Message") || "Update records";
          const apiURL = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

          let latestSHA = "";
          const checkRes = await fetch(`${apiURL}?ref=${branch}`, {
            headers: {
              "Authorization": `Bearer ${pat}`,
              "Accept": "application/vnd.github+json",
              "User-Agent": "Seiralab-Atlas-Edge"
            }
          });
          if (checkRes.ok) {
            const existing = await checkRes.json();
            latestSHA = existing.sha;
          }

          const putPayload = {
            message: `[Seiralab ${role}] ${commitMsg}`,
            content: utf8ToBase64(rawBody),
            branch
          };
          if (latestSHA) putPayload.sha = latestSHA;

          const putRes = await fetch(apiURL, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${pat}`,
              "Accept": "application/vnd.github+json",
              "Content-Type": "application/json",
              "User-Agent": "Seiralab-Atlas-Edge",
              "X-GitHub-Api-Version": "2022-11-28"
            },
            body: JSON.stringify(putPayload)
          });

          const respText = await putRes.text();
          return new Response(respText, { status: putRes.status, headers: jsonHeaders });
        }
      }

      return new Response("Not Found", { status: 404 });
    }

    // 3. SERVE FRONTEND STATIC ASSETS WITH SECURITY HEADERS
    const response = await env.ASSETS.fetch(request);
    const securedHeaders = new Headers(response.headers);
    securedHeaders.set("X-Frame-Options", "DENY");
    securedHeaders.set("X-Content-Type-Options", "nosniff");
    securedHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: securedHeaders
    });
  }
};
