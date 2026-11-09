// ============================================================================
// SEIRALAB ATLAS CMMS — CLOUDFLARE WORKER (worker.js)
// 1. Server-Side Authentication (/api/login & /api/logout) with HMAC Signatures
// 2. GitHub Cloud Database Proxy (/api/data GET & POST) with Auto-SHA Recovery
// 3. Static Asset Delivery & Source File Protection
// ============================================================================

const DEFAULT_REPO_OWNER = "raizon001";
const DEFAULT_REPO_NAME = "seiralab-cmms-db";
const DEFAULT_BRANCH = "main";
const DEFAULT_FILE_PATH = "data/cmms_db.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Seiralab-Client, X-Seiralab-Role, X-Session-Token",
  "Access-Control-Expose-Headers": "X-File-SHA"
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate"
};

// Base64 helpers that safely handle UTF-8 characters (like ±, ñ, —)
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const cleanB64 = String(b64 || "").replace(/\s/g, "");
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// HMAC-SHA256 Session Token Signer & Verifier
async function signSessionToken(role, secret) {
  const issuedAt = Date.now();
  const payload = `${role}|${issuedAt}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `${ btoa(payload) }.${sigHex}`;
}

async function verifySessionToken(tokenStr, secret) {
  if (!tokenStr || !tokenStr.includes(".")) return null;
  try {
    const [b64Payload, providedSig] = tokenStr.split(".");
    const payload = atob(b64Payload);
    const [role, issuedAtStr] = payload.split("|");
    if (!role || !issuedAtStr) return null;

    // Expire tokens after 7 days
    if (Date.now() - Number(issuedAtStr) > 7 * 86400 * 1000) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSig = Array.from(new Uint8Array(expectedBuf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return providedSig === expectedSig ? role : null;
  } catch (_) {
    return null;
  }
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Handle CORS Preflight Requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const sessionSecret = env.SESSION_SECRET || "seiralab-atlas-hmac-secret-key-2026";

    // ========================================================================
    // 2. AUTHENTICATION ENDPOINT: POST /api/login
    // ========================================================================
    if (path === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();
        const role = String(body.role || "").trim();
        const password = String(body.password || "").trim();

        // Uses Cloudflare Secrets if configured, or falls back to standard Seiralab passwords
        const techPass = env.TECH_PASSWORD || "seiralabtech";
        const headPass = env.HEAD_PASSWORD || "seiralabhead";
        const adminPass = env.ADMIN_PASSWORD || "seiralabadmin";

        let isValid = false;
        if (role === "Visitor") isValid = true;
        else if (role === "Technical" && password === techPass) isValid = true;
        else if (role === "Head Technical" && password === headPass) isValid = true;
        else if (role === "MasterAdmin" && password === adminPass) isValid = true;

        if (!isValid) {
          return new Response(
            JSON.stringify({ success: false, error: `Invalid authorization password for ${role}.` }),
            { status: 401, headers: JSON_HEADERS }
          );
        }

        const signedToken = await signSessionToken(role, sessionSecret);
        const cookieStr = `seiralab_session=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;

        return new Response(
          JSON.stringify({ success: true, role, token: signedToken }),
          {
            status: 200,
            headers: {
              ...JSON_HEADERS,
              "Set-Cookie": cookieStr
            }
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: "Malformed login request." }),
          { status: 400, headers: JSON_HEADERS }
        );
      }
    }

    // ========================================================================
    // 3. LOGOUT ENDPOINT: POST /api/logout
    // ========================================================================
    if (path === "/api/logout") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          ...JSON_HEADERS,
          "Set-Cookie": "seiralab_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
        }
      });
    }

    // ========================================================================
    // 4. CLOUD DATABASE PROXY: GET & POST /api/data
    // ========================================================================
    if (path === "/api/data") {
      const token = env.GITHUB_TOKEN || "";
      const owner = env.GITHUB_OWNER || DEFAULT_REPO_OWNER;
      const repo = env.GITHUB_REPO || DEFAULT_REPO_NAME;
      const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
      const filePath = env.GITHUB_PATH || DEFAULT_FILE_PATH;

      // If GITHUB_TOKEN is not set in Cloudflare yet, return clean 200 local mode (never a 500 error)
      if (!token) {
        return new Response(
          JSON.stringify({
            mode: "local",
            message: "GITHUB_TOKEN not configured in Worker secrets yet; using local browser storage.",
            equipmentList: [],
            historyLogs: [],
            toolLogs: [],
            calibrationList: []
          }),
          { status: 200, headers: { ...JSON_HEADERS, "X-File-SHA": "local-only" } }
        );
      }

      const ghApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const ghHeaders = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Seiralab-ATLAS-Worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28"
      };

      // ---- 4A. GET /api/data (Load Database from GitHub) ----
      if (request.method === "GET") {
        try {
          const ghRes = await fetch(`${ghApiUrl}?ref=${encodeURIComponent(branch)}`, {
            method: "GET",
            headers: ghHeaders
          });

          // If file doesn't exist in the repo yet (404), return empty initial structure with 200
          if (ghRes.status === 404) {
            return new Response(
              JSON.stringify({
                equipmentList: [],
                historyLogs: [],
                toolLogs: [],
                calibrationList: []
              }),
              { status: 200, headers: { ...JSON_HEADERS, "X-File-SHA": "init" } }
            );
          }

          if (!ghRes.ok) {
            return new Response(
              JSON.stringify({ mode: "local", error: `GitHub API returned ${ghRes.status}` }),
              { status: 200, headers: { ...JSON_HEADERS, "X-File-SHA": "local-only" } }
            );
          }

          const fileMeta = await ghRes.json();
          const decodedJsonStr = fileMeta.content ? base64ToUtf8(fileMeta.content) : "{}";

          return new Response(decodedJsonStr, {
            status: 200,
            headers: {
              ...JSON_HEADERS,
              "X-File-SHA": fileMeta.sha || ""
            }
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ mode: "local", error: err.message }),
            { status: 200, headers: { ...JSON_HEADERS, "X-File-SHA": "local-only" } }
          );
        }
      }

      // ---- 4B. POST /api/data (Commit Updated Database to GitHub) ----
      if (request.method === "POST" || request.method === "PUT") {
        try {
          // Verify caller role via Cookie, Header Token, or X-Seiralab-Role
          const cookieToken = getCookieValue(request.headers.get("Cookie"), "seiralab_session");
          const headerToken = request.headers.get("X-Session-Token") || "";
          const verifiedRole =
            (await verifySessionToken(cookieToken, sessionSecret)) ||
            (await verifySessionToken(headerToken, sessionSecret)) ||
            request.headers.get("X-Seiralab-Role") ||
            "Technical";

          if (verifiedRole === "Visitor") {
            return new Response(
              JSON.stringify({ error: "Visitors have view-only access and cannot modify the database." }),
              { status: 403, headers: JSON_HEADERS }
            );
          }

          const body = await request.json();
          const commitMessage = body.message || `Seiralab ATLAS Update by ${verifiedRole}`;
          const payloadData = body.data || body;
          let sha = body.sha && body.sha !== "init" && body.sha !== "local-only" ? body.sha : undefined;

          // Fetch latest SHA from GitHub if missing so commits never fail
          if (!sha) {
            const checkRes = await fetch(`${ghApiUrl}?ref=${encodeURIComponent(branch)}`, {
              method: "GET",
              headers: ghHeaders
            });
            if (checkRes.ok) {
              const checkMeta = await checkRes.json();
              sha = checkMeta.sha;
            }
          }

          const jsonString = JSON.stringify(payloadData, null, 2);
          const encodedContent = utf8ToBase64(jsonString);

          const putBody = {
            message: commitMessage,
            content: encodedContent,
            branch: branch
          };
          if (sha) putBody.sha = sha;

          let putRes = await fetch(ghApiUrl, {
            method: "PUT",
            headers: { ...ghHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(putBody)
          });

          // Auto-retry once if SHA conflict (409 or 422) occurred from another engineer saving simultaneously
          if (putRes.status === 409 || putRes.status === 422) {
            const latestRes = await fetch(`${ghApiUrl}?ref=${encodeURIComponent(branch)}`, {
              method: "GET",
              headers: ghHeaders
            });
            if (latestRes.ok) {
              const latestMeta = await latestRes.json();
              putBody.sha = latestMeta.sha;
              putRes = await fetch(ghApiUrl, {
                method: "PUT",
                headers: { ...ghHeaders, "Content-Type": "application/json" },
                body: JSON.stringify(putBody)
              });
            }
          }

          if (!putRes.ok) {
            const errText = await putRes.text();
            return new Response(
              JSON.stringify({ error: "GitHub commit failed", status: putRes.status, details: errText }),
              { status: putRes.status, headers: JSON_HEADERS }
            );
          }

          const putResult = await putRes.json();
          const newSha = putResult?.content?.sha || "";

          return new Response(
            JSON.stringify({ ok: true, sha: newSha, role: verifiedRole }),
            {
              status: 200,
              headers: {
                ...JSON_HEADERS,
                "X-File-SHA": newSha
              }
            }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err.message || "Failed to save database" }),
            { status: 500, headers: JSON_HEADERS }
          );
        }
      }
    }

    // ========================================================================
    // 5. BLOCK DIRECT ACCESS TO SENSITIVE CONFIG FILES
    // ========================================================================
    const blockedPaths = ["/worker.js", "/wrangler.toml", "/.assetsignore", "/package.json"];
    if (blockedPaths.includes(path.toLowerCase())) {
      return new Response("403 Forbidden — Protected Seiralab Resource", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // ========================================================================
    // 6. SERVE STATIC FRONTEND ASSETS (index.html, atlas.min.js, style.css, logos)
    // ========================================================================
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Seiralab ATLAS Worker is running. Static ASSETS binding not found in wrangler.toml.", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
};
