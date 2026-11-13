(function () {
  "use strict";
  var cfg = window.IP_CONFIG || {};

  // Preview banner
  var bar = document.getElementById("preview-bar");
  if (bar && cfg.preview) bar.hidden = false;

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Header border once the page scrolls
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Mobile navigation
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", function () { setOpen(!nav.classList.contains("is-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
  }

  // Sign-up forms (any form with data-netlify). Email is the only required field,
  // plus "I'm a" where a form asks for it.
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  Array.prototype.forEach.call(document.querySelectorAll("form[data-netlify]"), function (form) {
    var statusEl = form.querySelector(".form-status");
    var submit = form.querySelector("button[type=submit]");

    function showStatus(kind, title, detail) {
      statusEl.dataset.kind = kind;
      statusEl.innerHTML = "";
      var p = document.createElement("p"); p.textContent = title; statusEl.appendChild(p);
      if (detail) { var d = document.createElement("p"); d.textContent = detail; statusEl.appendChild(d); }
      statusEl.hidden = false;
    }
    function setError(input, msg) {
      var err = input.id && document.getElementById(input.id + "-error");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
      else if (msg) showStatus("error", msg);
    }
    function validate() {
      var email = form.elements.email, role = form.elements.role, first = null;
      var v = email.value.trim();
      if (!v) { setError(email, "Enter your email address."); first = email; }
      else if (!EMAIL.test(v)) { setError(email, "Enter an email address like name@example.com."); first = email; }
      else setError(email, "");
      if (role && role.required) {
        if (!role.value) { setError(role, "Choose the option that fits you best."); first = first || role; }
        else setError(role, "");
      }
      return first;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.hidden = true;
      var firstBad = validate();
      if (firstBad) { firstBad.focus(); return; }
      // The hidden field is invisible to people, so only automated submissions fill it.
      if (form.elements.company && form.elements.company.value) {
        showStatus("error", "We couldn't send that.", "Please reload the page and try again.");
        return;
      }
      if (cfg.formEndpoint !== "netlify") {
        showStatus("warn", "Not sent. This preview form isn't connected yet.", "Nothing you entered was sent or stored.");
        return;
      }
      var body = new URLSearchParams();
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.name === "company") return;
        body.append(el.name, String(el.value).trim().slice(0, 1000));
      });
      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Sending…";
      fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          showStatus("ok", "You're on the list.", "We'll email you when early access opens.");
        }).catch(function () {
          showStatus("error", "We couldn't send that.", "Check your connection and try again.");
        }).then(function () {
          submit.disabled = false;
          submit.textContent = label;
        });
    });
  });
})();

// Opportunity report dialog (concept preview)
(function () {
  var dlg = document.getElementById('report');
  var open = document.getElementById('open-report');
  if (!dlg || !open || typeof dlg.showModal !== 'function') return;
  var close = document.getElementById('close-report');
  var cta = document.getElementById('report-cta');
  open.addEventListener('click', function () { dlg.showModal(); });
  close.addEventListener('click', function () { dlg.close(); });
  cta.addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { open.focus(); });
})();

// Where visitors came from: recorded automatically, kept separate from any
// "How did you hear about us?" answer.
(function () {
  var refs = document.querySelectorAll('input[name=referrer]'), camps = document.querySelectorAll('input[name=campaign]');
  try {
    var r = (document.referrer && new URL(document.referrer).host !== location.host) ? document.referrer.slice(0, 300) : '';
    var q = new URLSearchParams(location.search), parts = [];
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (q.get(k)) parts.push(k.slice(4) + '=' + q.get(k).slice(0, 80)); });
    Array.prototype.forEach.call(refs, function (el) { el.value = r; });
    Array.prototype.forEach.call(camps, function (el) { el.value = parts.join('; '); });
  } catch (e) { /* leave blank */ }
})();

// Trailer: load YouTube only when someone presses play.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-yt]'), function (btn) {
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
      f.title = btn.getAttribute('aria-label') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      btn.replaceWith(f);
    });
  });
})();

/* GTA VI launch countdown (official date per saved research, 23 Oct 2026) */
(function () {
  var el = document.getElementById('countdown');
  if (!el) return;
  var launch = new Date(2026, 10, 19);
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var days = Math.round((launch - today) / 86400000);
  if (days > 1) el.textContent = days + ' days to launch · 19 Nov 2026';
  else if (days === 1) el.textContent = 'Launches tomorrow · 19 Nov 2026';
  else if (days === 0) el.textContent = 'Launch day · 19 Nov 2026';
  else el.textContent = 'Launched 19 Nov 2026';
})();
