/**
 * public/swagger-auth.js
 * ────────────────────────
 * Injected into Swagger UI to:
 *  1. Add a "Login with Google" button below the API info block
 */

(function () {
  /* ─── Google Login button ────────────────────────────────── */
  function injectGoogleLoginButton() {
    if (document.getElementById('google-oauth-swagger-btn')) return;

    var infoContainer = document.querySelector('.swagger-ui .info');
    if (!infoContainer) return;

    var btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'margin-top:16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;';

    var googleBtn = document.createElement('button');
    googleBtn.id = 'google-oauth-swagger-btn';
    googleBtn.type = 'button';
    googleBtn.innerHTML = [
      '<svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0">',
      '<path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>',
      '<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>',
      '<path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.1-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.19 0 7.56 0 9s.35 2.81.97 4.04l2.9-2.26z"/>',
      '<path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z"/>',
      '</svg>',
      '<strong>Login with Google</strong>',
    ].join('');

    googleBtn.style.cssText = [
      'background: #ffffff',
      'color: #3c4043',
      'border: 1px solid #dadce0',
      'border-radius: 8px',
      'padding: 9px 18px',
      'font-size: 14px',
      'font-family: sans-serif',
      'font-weight: 500',
      'cursor: pointer',
      'display: inline-flex',
      'align-items: center',
      'gap: 10px',
      'box-shadow: 0 1px 3px rgba(60,64,67,0.15)',
      'transition: all 0.2s ease',
    ].join(';');

    googleBtn.onmouseover = function () { googleBtn.style.boxShadow = '0 2px 8px rgba(60,64,67,0.25)'; googleBtn.style.transform = 'translateY(-1px)'; };
    googleBtn.onmouseout = function () { googleBtn.style.boxShadow = '0 1px 3px rgba(60,64,67,0.15)'; googleBtn.style.transform = ''; };
    googleBtn.onclick = function () { window.open(window.location.origin + '/api/v1/auth/google', '_blank'); };

    var hint = document.createElement('span');
    hint.textContent = 'Opens Google login in a new tab → copy the token → Authorize 🔒';
    hint.style.cssText = 'font-size:12px;color:#64748b;font-family:sans-serif;';

    btnContainer.appendChild(googleBtn);
    btnContainer.appendChild(hint);
    infoContainer.appendChild(btnContainer);
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    injectGoogleLoginButton();
  }

  var observer = new MutationObserver(function () { 
    injectGoogleLoginButton(); 
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    init();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  setInterval(injectGoogleLoginButton, 800);
})();
