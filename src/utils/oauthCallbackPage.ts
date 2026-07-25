/**
 * oauthCallbackPage.ts
 * ─────────────────────
 * Generates the HTML for the developer-facing OAuth callback page.
 * Displayed after Google login completes — shows access token.
 */

export function buildOAuthCallbackHtml(accessToken: string, refreshToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Login Successful</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1a1d2e; border: 1px solid #2d3148; border-radius: 16px; padding: 40px; max-width: 640px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    .badge::before { content: '\\2713'; font-weight: 700; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #f8fafc; }
    p.subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 28px; line-height: 1.6; }
    label { display: block; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .token-section { margin-bottom: 20px; }
    .token-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .token-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 2px 8px; border-radius: 4px; }
    .tag-access { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); }
    .token-box { background: #0f1117; border: 1px solid #2d3148; border-radius: 10px; padding: 14px 16px; font-family: 'Courier New', monospace; font-size: 12px; color: #a5b4fc; word-break: break-all; line-height: 1.7; max-height: 100px; overflow-y: auto; }
    .token-box::-webkit-scrollbar { width: 4px; }
    .token-box::-webkit-scrollbar-thumb { background: #2d3148; border-radius: 4px; }
    .copy-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all .2s ease; white-space: nowrap; }
    .btn-access { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; }
    .btn-access:hover { opacity: .88; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.35); }
    .btn-swagger { background: #1e2235; border: 1px solid #2d3148; color: #cbd5e1; width: 100%; justify-content: center; padding: 10px 20px; font-size: 14px; margin-top: 4px; }
    .btn-swagger:hover { background: #252840; }
    .copy-msg { font-size: 12px; color: #4ade80; opacity: 0; transition: opacity .3s; }
    .copy-msg.show { opacity: 1; }
    .divider { border: none; border-top: 1px solid #2d3148; margin: 24px 0; }
    .steps { list-style: none; counter-reset: steps; }
    .steps li { counter-increment: steps; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; color: #94a3b8; margin-bottom: 10px; line-height: 1.5; }
    .steps li::before { content: counter(steps); background: #2d3148; color: #a5b4fc; font-weight: 700; font-size: 11px; min-width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    code { background: #0f1117; border: 1px solid #2d3148; border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #a5b4fc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Authentication Successful</div>
    <h1>You're logged in!</h1>
    <p class="subtitle">Copy your Access Token below to authorize Swagger. Your Refresh Token has been securely set as an HttpOnly cookie.</p>

    <div class="token-section">
      <div class="token-header">
        <label style="margin:0">Access Token (JWT)</label>
        <span class="token-tag tag-access">15 min expiry</span>
      </div>
      <div class="token-box" id="access-token">${accessToken}</div>
      <div class="copy-row">
        <button class="btn btn-access" onclick="copy('access-token','access-msg')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Access Token
        </button>
        <span class="copy-msg" id="access-msg">Copied!</span>
      </div>
    </div>

    <div class="token-section">
      <div class="token-header">
        <label style="margin:0">Refresh Token (Opaque)</label>
        <span class="token-tag tag-access" style="background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.3);">7 days expiry</span>
      </div>
      <div class="token-box" id="refresh-token">${refreshToken}</div>
      <div class="copy-row">
        <button class="btn btn-swagger" style="width: auto; margin:0;" onclick="copy('refresh-token','refresh-msg')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Refresh Token
        </button>
        <span class="copy-msg" id="refresh-msg">Copied!</span>
      </div>
    </div>

    <button class="btn btn-swagger" onclick="window.location.href='/api-docs'">
      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      Open Swagger UI
    </button>

    <hr class="divider"/>
    <label>How to use in Swagger</label>
    <ol class="steps">
      <li>Copy the <strong>Access Token</strong> &rarr; click <strong>Authorize</strong> in Swagger &rarr; paste in the <code>BearerAuth</code> field.</li>
      <li>All protected routes are now unlocked.</li>
      <li>To get a new Access Token, call <code>POST /auth/refresh</code>. The browser will automatically send your HttpOnly refresh token cookie.</li>
      <li>To logout, call <code>POST /auth/logout</code>. This clears your cookie and revokes the token.</li>
    </ol>
  </div>
  <script>
    function copy(elId, msgId) {
      navigator.clipboard.writeText(document.getElementById(elId).innerText.trim()).then(function() {
        var m = document.getElementById(msgId);
        m.classList.add('show');
        setTimeout(function() { m.classList.remove('show'); }, 2500);
      });
    }
  </script>
</body>
</html>`;
}
