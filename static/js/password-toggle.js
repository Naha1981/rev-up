/* Show/hide toggle for every password field (sign in, sign up, reset, settings). */
(function () {
  function enhance(inp) {
    if (inp.dataset.pwToggle) return;
    inp.dataset.pwToggle = "1";
    var wrap = document.createElement("div");
    wrap.style.position = "relative";
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    inp.style.paddingRight = "3rem";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("aria-pressed", "false");
    btn.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--text-secondary,#6b7280);";
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.addEventListener("click", function () {
      var show = inp.type === "password";
      inp.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.innerHTML = show
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
    wrap.appendChild(btn);
  }
  function scan() { document.querySelectorAll('input[type="password"]').forEach(enhance); }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }
})();
