/* Saved-example walkthrough.
   Renders one saved research example from static JSON (see data/example.schema.md)
   as a six-step walkthrough around a dated timeline. Nothing here runs a live
   investigation: the page only displays what was recorded.
   A future approved backend can return the same shape; only loadExample() would change. */
(function () {
  "use strict";
  var cfg = window.IP_CONFIG || {};
  var mount = document.getElementById("radar-demo");
  if (!mount) return;

  var SVGNS = "http://www.w3.org/2000/svg";
  var STEPS = [
    { key: "question", name: "Question" },
    { key: "evidence", name: "Evidence" },
    { key: "first", name: "First finding" },
    { key: "revision", name: "Revision" },
    { key: "limits", name: "Limits" },
    { key: "use", name: "Why it matters" }
  ];
  var state = { step: 0, data: null };
  var els = {};
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- helpers ---------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function fmtDate(d) {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "Undated";
    var p = d.split("-");
    return Number(p[2]) + " " + MONTHS[Number(p[1]) - 1] + " " + p[0];
  }
  function safeUrl(u) {
    try { var x = new URL(u); return x.protocol === "https:" ? x.href : null; }
    catch (e) { return null; }
  }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

  /* ---------- timeline ---------- */
  // Shows when each announcement was published (top track) and the release date
  // it supported (bottom track). Spans whole years around the dates involved.
  function buildTimeline() {
    var d = state.data;
    var dates = [d.retrievedOn];
    d.evidence.forEach(function (e) { dates.push(e.date); });
    d.findings.forEach(function (f) { dates.push(f.target); });
    var years = dates.filter(Boolean).map(function (x) { return Number(x.slice(0, 4)); });
    var y0 = Math.min.apply(null, years), y1 = Math.max.apply(null, years) + 1;
    var W = 880, L = 120, R = 24, TOP = 64, BOT = 172, H = 232;
    var t0 = Date.UTC(y0, 0, 1), t1 = Date.UTC(y1, 0, 1);
    function x(date) { return L + (Date.parse(date) - t0) / (t1 - t0) * (W - L - R); }

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, "class": "tl", role: "img", "aria-labelledby": "tl-title tl-desc" });
    root.appendChild(svg("title", { id: "tl-title" }, "Timeline of announcements and the release dates they supported"));
    var desc = d.evidence.filter(function (e) { return !e.duplicateOf; }).map(function (e) { return fmtDate(e.date) + ": " + e.title; }).join(" ");
    root.appendChild(svg("desc", { id: "tl-desc" }, desc));

    var defs = svg("defs");
    var m = svg("marker", { id: "tl-arrow", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
    m.appendChild(svg("path", { d: "M0 1 L9 5 L0 9 Z", "class": "tl-arrowhead" }));
    defs.appendChild(m);
    var mh = svg("marker", { id: "tl-arrow-h", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
    mh.appendChild(svg("path", { d: "M0 1 L9 5 L0 9 Z", "class": "tl-arrowhead is-history" }));
    defs.appendChild(mh);
    root.appendChild(defs);

    // Track labels
    root.appendChild(svg("text", { x: 0, y: TOP + 4, "class": "tl-track" }, "Announced"));
    root.appendChild(svg("text", { x: 0, y: BOT + 4, "class": "tl-track" }, "Release date"));
    root.appendChild(svg("text", { x: 0, y: BOT + 20, "class": "tl-track tl-track-sub" }, "it supported"));
    root.appendChild(svg("line", { x1: L, x2: W - R, y1: TOP, y2: TOP, "class": "tl-rail" }));
    root.appendChild(svg("line", { x1: L, x2: W - R, y1: BOT, y2: BOT, "class": "tl-rail" }));

    // Year and quarter ticks along the bottom
    for (var y = y0; y <= y1; y++) {
      var xx = x(y + "-01-01");
      root.appendChild(svg("line", { x1: xx, x2: xx, y1: TOP - 14, y2: H - 22, "class": "tl-year" }));
      if (y < y1) root.appendChild(svg("text", { x: xx + 6, y: H - 6, "class": "tl-year-label" }, String(y)));
      if (y < y1) [4, 7, 10].forEach(function (mo) {
        var q = x(y + "-" + (mo < 10 ? "0" : "") + mo + "-01");
        root.appendChild(svg("line", { x1: q, x2: q, y1: BOT - 4, y2: BOT + 4, "class": "tl-tick" }));
        root.appendChild(svg("line", { x1: q, x2: q, y1: TOP - 4, y2: TOP + 4, "class": "tl-tick" }));
      });
    }

    // Investigation date
    if (d.retrievedOn) {
      var xr = x(d.retrievedOn);
      var g = svg("g", { "class": "tl-retrieved" });
      g.appendChild(svg("line", { x1: xr, x2: xr, y1: 14, y2: H - 22 }));
      g.appendChild(svg("text", { x: xr - 6, y: 24, "text-anchor": "end" }, "Investigated " + fmtDate(d.retrievedOn)));
      root.appendChild(g);
    }

    // Findings: arrow from announcement to the date it supported
    d.findings.forEach(function (f, i) {
      var src = byId(d.evidence, f.basedOn.filter(function (id) { return !byId(d.evidence, id).duplicateOf; })[0] || f.basedOn[0]);
      var xa = x(src.date), xb = x(f.target);
      var g = svg("g", { "class": "tl-finding" + (i === 0 ? " is-first" : "") + (i === d.findings.length - 1 ? " is-last" : " is-earlier"), "data-finding": f.id });
      var midY = (TOP + BOT) / 2;
      g.appendChild(svg("path", {
        d: "M" + xa + " " + (TOP + 10) + " C " + xa + " " + midY + ", " + xb + " " + midY + ", " + xb + " " + (BOT - 12),
        "class": "tl-link", "marker-end": "url(#tl-arrow)", pathLength: "1"
      }));
      g.appendChild(svg("circle", { cx: xb, cy: BOT, r: 7, "class": "tl-target" }));
      var anchor = xb > W - 140 ? "end" : "middle";
      g.appendChild(svg("text", { x: anchor === "end" ? xb + 8 : xb, y: BOT + 30, "text-anchor": anchor, "class": "tl-target-label" }, fmtDate(f.target)));
      g.appendChild(svg("text", { x: anchor === "end" ? xb + 8 : xb, y: BOT + 46, "text-anchor": anchor, "class": "tl-target-tag" }, i === d.findings.length - 1 ? "Current finding" : "Kept as history"));
      root.appendChild(g);
    });

    // Announcements
    var seen = {};
    d.evidence.forEach(function (e) {
      var xe = x(e.date), stack = seen[e.date] = (seen[e.date] || 0) + 1;
      var g = svg("g", { "class": "tl-ev" + (e.duplicateOf ? " is-duplicate" : ""), "data-ev": e.id });
      g.appendChild(svg("rect", { x: xe - 7 + (stack - 1) * 6, y: TOP - 7 - (stack - 1) * 6, width: 14, height: 14, rx: 3 }));
      if (!e.duplicateOf) g.appendChild(svg("text", { x: xe, y: TOP - 18 - (seen[e.date] - 1) * 6, "text-anchor": "middle", "class": "tl-ev-label" }, fmtDate(e.date)));
      root.appendChild(g);
    });

    return el("div", { "class": "tl-scroll tl-wide" }, [root]);
  }

  // Narrow screens: same content, with time running down the page.
  function buildTimelineTall() {
    var d = state.data;
    var dates = [d.retrievedOn];
    d.evidence.forEach(function (e) { dates.push(e.date); });
    d.findings.forEach(function (f) { dates.push(f.target); });
    var years = dates.filter(Boolean).map(function (x) { return Number(x.slice(0, 4)); });
    var y0 = Math.min.apply(null, years), y1 = Math.max.apply(null, years) + 1;
    var W = 340, A = 112, R = 232, T = 56, B = 560, H = 580;
    var t0 = Date.UTC(y0, 0, 1), t1 = Date.UTC(y1, 0, 1);
    function y(date) { return T + (Date.parse(date) - t0) / (t1 - t0) * (B - T); }

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, "class": "tl tl-v", role: "img", "aria-labelledby": "tlv-title" });
    root.appendChild(svg("title", { id: "tlv-title" }, "Timeline of announcements and the release dates they supported"));
    var defs = svg("defs");
    [["tl-arrow", ""], ["tl-arrow-h", " is-history"]].forEach(function (mk) {
      var m = svg("marker", { id: mk[0] + "-v", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
      m.appendChild(svg("path", { d: "M0 1 L9 5 L0 9 Z", "class": "tl-arrowhead" + mk[1] }));
      defs.appendChild(m);
    });
    root.appendChild(defs);

    root.appendChild(svg("text", { x: A, y: 16, "text-anchor": "middle", "class": "tl-track" }, "Announced"));
    root.appendChild(svg("text", { x: R, y: 16, "text-anchor": "middle", "class": "tl-track" }, "Release date"));
    root.appendChild(svg("text", { x: R, y: 32, "text-anchor": "middle", "class": "tl-track tl-track-sub" }, "it supported"));
    root.appendChild(svg("line", { x1: A, x2: A, y1: T, y2: B, "class": "tl-rail" }));
    root.appendChild(svg("line", { x1: R, x2: R, y1: T, y2: B, "class": "tl-rail" }));
    for (var yr = y0; yr <= y1; yr++) {
      var yy = y(yr + "-01-01");
      root.appendChild(svg("line", { x1: 0, x2: W, y1: yy, y2: yy, "class": "tl-year" }));
      if (yr < y1) root.appendChild(svg("text", { x: W, y: yy + 16, "text-anchor": "end", "class": "tl-year-label" }, String(yr)));
    }
    if (d.retrievedOn) {
      var yr2 = y(d.retrievedOn), g0 = svg("g", { "class": "tl-retrieved" });
      g0.appendChild(svg("line", { x1: 0, x2: W, y1: yr2, y2: yr2 }));
      g0.appendChild(svg("text", { x: 0, y: yr2 - 6 }, "Investigated " + fmtDate(d.retrievedOn)));
      root.appendChild(g0);
    }
    d.findings.forEach(function (f, i) {
      var src = byId(d.evidence, f.basedOn.filter(function (id) { return !byId(d.evidence, id).duplicateOf; })[0] || f.basedOn[0]);
      var ya = y(src.date), yb = y(f.target), last = i === d.findings.length - 1;
      var g = svg("g", { "class": "tl-finding" + (i === 0 ? " is-first" : "") + (last ? " is-last" : " is-earlier") });
      g.appendChild(svg("path", { d: "M" + (A + 10) + " " + ya + " C " + (A + 70) + " " + ya + ", " + (R - 70) + " " + yb + ", " + (R - 12) + " " + yb, "class": "tl-link", "marker-end": "url(#tl-arrow-v)", pathLength: "1" }));
      g.appendChild(svg("circle", { cx: R, cy: yb, r: 7, "class": "tl-target" }));
      g.appendChild(svg("text", { x: R + 14, y: yb + 4, "class": "tl-target-label" }, fmtDate(f.target)));
      g.appendChild(svg("text", { x: R + 14, y: yb + 20, "class": "tl-target-tag" }, last ? "Current" : "History"));
      root.appendChild(g);
    });
    var seen = {};
    d.evidence.forEach(function (e) {
      var ye = y(e.date), stack = seen[e.date] = (seen[e.date] || 0) + 1;
      var g = svg("g", { "class": "tl-ev" + (e.duplicateOf ? " is-duplicate" : "") });
      g.appendChild(svg("rect", { x: A - 7 - (stack - 1) * 6, y: ye - 7 - (stack - 1) * 6, width: 14, height: 14, rx: 3 }));
      if (!e.duplicateOf) g.appendChild(svg("text", { x: A - 22, y: ye + 4, "text-anchor": "end", "class": "tl-ev-label" }, fmtDate(e.date)));
      root.appendChild(g);
    });
    return el("div", { "class": "tl-scroll tl-tall" }, [root]);
  }

  /* ---------- stage content ---------- */
  function kicker(text, extra) { return el("p", { "class": "rd-kicker" }, [text, extra || null]); }
  function tag(text, kind) { return el("span", { "class": "rd-tag rd-tag-" + kind, text: text }); }

  function evidenceItem(e) {
    var href = safeUrl(e.url);
    return el("li", { "class": "rd-ev" + (e.duplicateOf ? " is-duplicate" : "") }, [
      el("time", { "class": "rd-date", datetime: e.date, text: fmtDate(e.date) }),
      el("div", {}, [
        el("p", { "class": "rd-ev-title", text: e.title }),
        el("p", { "class": "rd-ev-src" }, [
          e.publisher,
          href ? " · " : null,
          href ? el("a", { href: href, target: "_blank", rel: "noopener", text: "Public source" }) : null
        ]),
        e.note ? el("p", { "class": "rd-ev-note", text: e.note }) : null
      ])
    ]);
  }

  function findingCard(f, current) {
    return el("div", { "class": "rd-finding-card" + (current ? " is-current" : " is-history") }, [
      el("p", { "class": "rd-finding-label" }, [f.label, tag(current ? "Current" : "Kept as history", current ? "current" : "history")]),
      el("p", { "class": "rd-finding" }, [current ? el("mark", { text: f.statement }) : f.statement]),
      el("p", { "class": "rd-ev-src", text: "Based on the announcement of " + fmtDate(f.asOf) })
    ]);
  }

  var STAGES = {
    question: function (d) {
      return [
        kicker("The question, exactly as recorded"),
        el("blockquote", { "class": "rd-question", text: d.question }),
        el("p", { "class": "rd-sub", text: "A narrow question gets an answer you can check. Follow the steps to see the evidence, the first answer, and what happened when new evidence arrived." })
      ];
    },
    evidence: function (d) {
      var ul = el("ul", { "class": "rd-evidence" });
      d.evidence.forEach(function (e) { ul.appendChild(evidenceItem(e)); });
      return [kicker("Dated evidence, retrieved " + fmtDate(d.retrievedOn)), ul];
    },
    first: function (d) {
      return [
        kicker("What the evidence supported first"),
        findingCard(d.findings[0], true),
        d.findings[0].context ? el("p", { "class": "rd-sub", text: d.findings[0].context }) : null
      ];
    },
    revision: function (d) {
      var last = d.findings[d.findings.length - 1];
      var cards = el("div", { "class": "rd-revision" }, [findingCard(last, true)].concat(
        d.findings.slice(0, -1).reverse().map(function (f) { return findingCard(f, false); })
      ));
      return [
        kicker("New evidence, updated finding"),
        cards,
        el("p", { "class": "rd-note" }, [el("strong", { text: "Stated inference. " }), d.inference])
      ];
    },
    limits: function (d) {
      var ul = el("ul", { "class": "rd-limits" });
      d.limits.forEach(function (l) { ul.appendChild(el("li", { text: l })); });
      return [
        kicker("How far to trust it"),
        el("div", { "class": "rd-verdict" }, [
          el("div", {}, [el("p", { "class": "rd-verdict-k", text: "Assessment" }), el("p", { "class": "rd-verdict-v", text: d.disposition })]),
          el("div", {}, [el("p", { "class": "rd-verdict-k", text: "Review" }), el("p", { "class": "rd-verdict-v rd-verdict-small", text: d.review })])
        ]),
        el("p", { "class": "rd-sub", text: "Recorded limitations" }),
        ul
      ];
    },
    use: function (d) {
      var grid = el("div", { "class": "rd-uses" });
      d.applications.forEach(function (a) {
        grid.appendChild(el("div", { "class": "rd-use" }, [el("p", { "class": "rd-use-title", text: a.title }), el("p", { text: a.text })]));
      });
      return [
        kicker("Why it could matter to a creator ", tag("Illustrative", "illustrative")),
        el("p", { "class": "rd-sub", text: d.applicationsNote }),
        grid,
        el("a", { "class": "btn rd-cta", href: "#access" }, ["Request early access ", el("span", { "class": "arrow", "aria-hidden": "true", text: "→" })])
      ];
    }
  };

  /* ---------- navigation ---------- */
  function go(i) {
    state.step = Math.max(0, Math.min(STEPS.length - 1, i));
    var key = STEPS[state.step].key;
    els.tabs.forEach(function (t, n) {
      t.setAttribute("aria-selected", String(n === state.step));
      t.tabIndex = n === state.step ? 0 : -1;
      t.classList.toggle("is-done", n < state.step);
    });
    els.panel.style.setProperty("--p", ((state.step + 1) / STEPS.length).toFixed(3));
    els.panel.dataset.step = key;
    els.stage.setAttribute("aria-labelledby", "rd-tab-" + state.step);
    els.stage.innerHTML = "";
    els.stage.appendChild(el("div", { "class": "rd-stage-inner" }, STAGES[key](state.data)));
    els.prev.disabled = state.step === 0;
    els.next.hidden = state.step === STEPS.length - 1;
    els.nextLabel.textContent = "Next: " + (STEPS[state.step + 1] || {}).name;
  }

  function render() {
    var d = state.data;
    var draft = d.status !== "approved";
    var tablist = el("div", { "class": "rd-tabs", role: "tablist", "aria-label": "Walkthrough steps" });
    els.tabs = STEPS.map(function (s, i) {
      var t = el("button", { type: "button", role: "tab", id: "rd-tab-" + i, "aria-controls": "rd-stage", "class": "rd-tab" }, [
        el("span", { "class": "rd-tab-n", text: String(i + 1) }), s.name
      ]);
      t.addEventListener("click", function () { go(i); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = (i + 1) % STEPS.length;
        if (e.key === "ArrowLeft") n = (i - 1 + STEPS.length) % STEPS.length;
        if (e.key === "Home") n = 0;
        if (e.key === "End") n = STEPS.length - 1;
        if (n !== null) { e.preventDefault(); go(n); els.tabs[n].focus(); }
      });
      tablist.appendChild(t);
      return t;
    });

    els.stage = el("div", { "class": "rd-stage", id: "rd-stage", role: "tabpanel", "aria-live": "polite" });
    els.prev = el("button", { type: "button", "class": "rd-btn rd-btn-quiet", text: "Back" });
    els.nextLabel = el("span", { text: "Next" });
    els.next = el("button", { type: "button", "class": "rd-btn" }, [els.nextLabel, el("span", { "aria-hidden": "true", text: " →" })]);
    els.prev.addEventListener("click", function () { go(state.step - 1); });
    els.next.addEventListener("click", function () { go(state.step + 1); });

    els.panel = el("div", { "class": "rd-panel" }, [
      el("div", { "class": "rd-top" }, [
        el("div", { "class": "rd-title" }, [
          el("span", { "class": "rd-case", text: d.title }),
          el("span", { "class": "rd-badge", text: "Saved example" }),
          draft ? el("span", { "class": "rd-badge is-draft", text: "Draft · not approved for publication" }) : null
        ]),
        tablist,
        el("div", { "class": "rd-progress", "aria-hidden": "true" })
      ]),
      el("div", { "class": "rd-visual" }, [buildTimeline(), buildTimelineTall()]),
      els.stage,
      el("div", { "class": "rd-foot" }, [
        el("p", { "class": "rd-disclaimer", text: d.historicalNote + " Shown as recorded; nothing is generated live." }),
        el("div", { "class": "rd-nav" }, [els.prev, els.next])
      ])
    ]);
    mount.innerHTML = "";
    mount.appendChild(els.panel);
    go(0);
  }

  function renderMessage(text) {
    mount.innerHTML = "";
    mount.appendChild(el("div", { "class": "rd-panel rd-pending" }, [el("p", { text: text })]));
  }

  function loadExample() {
    return fetch(cfg.demoExample, { headers: { Accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  if (!cfg.demoExample) { renderMessage("A saved example will appear here once one is approved."); return; }
  loadExample().then(function (x) {
    var valid = x && x.question && x.evidence && x.evidence.length && x.findings && x.findings.length;
    // Drafts never render on the public site, even if config points at one.
    var allowed = x && (x.status === "approved" || (x.status === "draft" && cfg.preview));
    if (!valid || !allowed) return renderMessage("A saved example will appear here once one is approved.");
    state.data = x;
    render();
  }).catch(function () {
    renderMessage("The saved example couldn't be loaded. Refresh the page to try again.");
  });
})();
