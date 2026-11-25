/* ==========================================================================
   Site core — Lenis smooth scroll, GSAP/ScrollTrigger, opening status,
   online booking → WhatsApp, themed dropdown, FAQ, nav, cursor.
   Configure with window.SITE before this file loads.
   ========================================================================== */
(() => {
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // "?motion" in the URL forces full animations (demo on a PC with "reduce motion" on)
  const forceMotion = new URLSearchParams(location.search).has("motion");
  const reduceMotion = !forceMotion && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const waLink = (t) => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(t)}`;
  const hasGSAP = () => typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const core = (window.CORE = { $, $$, waLink, reduceMotion, isTouch, lenis: null, intro: null });

  /* ───────── Time ───────── */
  function localNow() {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: S.timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date()).reduce((a, x) => (a[x.type] = x.value, a), {});
    return { day: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday], hour: (+p.hour % 24) + (+p.minute) / 60, date: new Date(+p.year, +p.month - 1, +p.day) };
  }
  const fmt = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${String(hh).padStart(2, "0")}h${mm ? String(mm).padStart(2, "0") : ""}`; };
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  function status() {
    const { day, hour } = localNow();
    const today = S.hours[day] || [];
    const cur = today.find(([a, b]) => hour >= a && hour < b);
    if (cur) return { open: true, text: `Aberto agora · até ${fmt(cur[1])}` };
    const next = today.find(([a]) => hour < a);
    if (next) return { open: false, text: today.some(([, b]) => hour >= b) ? `Pausa · volta às ${fmt(next[0])}` : `Abre hoje às ${fmt(next[0])}` };
    for (let k = 1; k <= 7; k++) { const d = (day + k) % 7; if (S.hours[d]) return { open: false, text: `Fechado agora · abre ${k === 1 ? "amanhã" : names[d]} às ${fmt(S.hours[d][0][0])}` }; }
    return { open: false, text: "" };
  }
  function renderStatus() {
    const s = status();
    $$("[data-status-dot]").forEach(d => d.classList.toggle("open", s.open));
    $$("[data-status-text]").forEach(t => (t.textContent = `${S.cityLabel} · ${s.text}`));
    $$("[data-status-inline]").forEach(t => { t.textContent = s.text; t.classList.toggle("open", s.open); });
  }
  function renderHours() {
    const body = $("#hoursBody"); if (!body) return;
    const N = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const { day } = localNow();
    body.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => `<tr class="${d === day ? "today" : ""}"><td>${N[d]}${d === day ? " (hoje)" : ""}</td><td>${S.hours[d] ? S.hours[d].map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(" · ") : "Fechado"}</td></tr>`).join("");
  }

  /* ───────── Dropdown (themed) ───────── */
  function makeDropdown(dd, options, initial, onChange) {
    const btn = $(".dd-btn", dd), list = $(".dd-list", dd), val = $(".dd-value", dd);
    list.innerHTML = options.map(o => `<li role="option" aria-selected="false">${o}</li>`).join("");
    const items = $$("li", list);
    let hover = 0, current = initial;
    const paint = () => items.forEach((li, i) => li.classList.toggle("hover", i === hover));
    const set = (v) => { current = v; val.textContent = v; items.forEach(li => li.setAttribute("aria-selected", String(li.textContent === v))); onChange?.(v); };
    const open = () => { $$(".dropdown.open").forEach(o => o !== dd && o.classList.remove("open")); const r = btn.getBoundingClientRect(); dd.classList.toggle("up", innerHeight - r.bottom < 320 && r.top > 320); dd.classList.add("open"); btn.setAttribute("aria-expanded", "true"); hover = Math.max(0, options.indexOf(current)); paint(); };
    const close = () => { dd.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
    const choose = (i) => { set(options[i]); close(); btn.focus(); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); dd.classList.contains("open") ? close() : open(); });
    items.forEach((li, i) => { li.addEventListener("click", (e) => { e.stopPropagation(); choose(i); }); li.addEventListener("mousemove", () => { hover = i; paint(); }); });
    btn.addEventListener("keydown", (e) => {
      const isOpen = dd.classList.contains("open");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!isOpen) return open(); hover = Math.max(0, Math.min(items.length - 1, hover + (e.key === "ArrowDown" ? 1 : -1))); paint(); items[hover].scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isOpen ? choose(hover) : open(); }
      else if (e.key === "Escape" && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", close);
    set(initial);
    return { set };
  }

  /* ───────── Booking ───────── */
  const booking = (core.booking = { day: null, slot: null, treatment: S.treatments[0] });
  function initBooking() {
    const form = $("#bookForm"); if (!form) return;
    const { date, hour } = localNow();
    const wk = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const days = []; const c = new Date(date); let off = 0;
    while (days.length < 6 && off < 14) {
      const dw = c.getDay(); const h = S.hours[dw];
      const lastClose = h ? h[h.length - 1][1] : 0;
      if (h && !(off === 0 && hour >= lastClose - 1)) {
        const dd = String(c.getDate()).padStart(2, "0"), mm = String(c.getMonth() + 1).padStart(2, "0");
        days.push({ dw, isToday: off === 0, label: `${wk[dw]}, ${dd}/${mm}`, tag: off === 0 ? "Hoje" : off === 1 ? "Amanhã" : wk[dw], num: `${dd}/${mm}` });
      }
      c.setDate(c.getDate() + 1); off++;
    }
    const daysEl = $("#days"), slotsEl = $("#slots");
    daysEl.innerHTML = days.map((d, i) => `<button type="button" class="day" data-i="${i}" aria-pressed="false"><small>${d.tag}</small><b>${d.num}</b></button>`).join("");
    slotsEl.innerHTML = S.slots.map(s => `<button type="button" class="slot" data-s="${s}">${s}</button>`).join("");
    const inHours = (dw, t) => (S.hours[dw] || []).some(([a, b]) => t >= a && t < b);
    const pick = (i) => {
      const d = days[i]; booking.day = d;
      $$(".day", daysEl).forEach((b, k) => { b.classList.toggle("active", k === i); b.setAttribute("aria-pressed", String(k === i)); });
      let first = null;
      $$(".slot", slotsEl).forEach(b => { const [h, m] = b.dataset.s.split(":").map(Number); const t = h + m / 60; b.disabled = !inHours(d.dw, t) || (d.isToday && t <= hour + 0.5); if (!b.disabled && !first) first = b; });
      if (!booking.slot || $(`.slot[data-s="${booking.slot}"]`, slotsEl).disabled) booking.slot = first?.dataset.s || null;
      $$(".slot", slotsEl).forEach(b => b.classList.toggle("active", b.dataset.s === booking.slot));
      const note = $("#slotNote"); if (note) note.textContent = S.slotNote?.(d.dw) || "Horário sujeito à confirmação da recepção.";
    };
    daysEl.addEventListener("click", (e) => { const b = e.target.closest(".day"); if (b) pick(+b.dataset.i); });
    slotsEl.addEventListener("click", (e) => { const b = e.target.closest(".slot"); if (!b || b.disabled) return; booking.slot = b.dataset.s; $$(".slot", slotsEl).forEach(x => x.classList.toggle("active", x === b)); });
    if (days.length) pick(0);

    core.treatDD = makeDropdown($("#treatDD"), S.treatments, S.treatments[0], (v) => (booking.treatment = v));

    const phone = $("#bPhone"), name = $("#bName"), hint = $("#bHint");
    phone.addEventListener("input", () => { const d = phone.value.replace(/\D/g, "").slice(0, 11); phone.value = d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`; phone.classList.remove("invalid"); hint.textContent = ""; });
    name.addEventListener("input", () => { name.classList.remove("invalid"); hint.textContent = ""; });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (name.value.trim().length < 2) { name.classList.add("invalid"); hint.textContent = "Informe seu nome."; name.focus(); return; }
      if (phone.value.replace(/\D/g, "").length < 10) { phone.classList.add("invalid"); hint.textContent = "Informe o WhatsApp com DDD."; phone.focus(); return; }
      if (!booking.slot) { hint.textContent = "Escolha um horário disponível."; return; }
      const extra = S.extraFields ? S.extraFields() : "";
      const msg = `Olá, ${S.brand}! Gostaria de agendar pelo site:\n\n• *Nome:* ${name.value.trim()}\n• *WhatsApp:* ${phone.value}\n• *${S.treatmentLabel || "Tratamento"}:* ${booking.treatment}\n${extra}• *Dia:* ${booking.day.label}\n• *Horário:* ${booking.slot}\n\nAguardo a confirmação. Obrigado(a)!`;
      window.open(waLink(msg), "_blank", "noopener");
    });
  }
  core.setTreatment = (t) => core.treatDD?.set(S.treatments.includes(t) ? t : S.treatments[0]);

  /* ───────── FAQ ───────── */
  function initFaq() {
    $$(".faq-item").forEach((item, idx) => {
      const q = $(".faq-q", item), a = $(".faq-a", item);
      const set = (open, instant) => {
        item.classList.toggle("open", open); q.setAttribute("aria-expanded", String(open));
        if (hasGSAP() && !instant && !reduceMotion) gsap.to(a, { height: open ? a.scrollHeight : 0, duration: 0.5, ease: "power3.out", onComplete: () => { if (open) a.style.height = "auto"; ScrollTrigger.refresh(); } });
        else a.style.height = open ? "auto" : "0px";
      };
      q.addEventListener("click", () => { if (!item.classList.contains("open") && a.style.height === "auto") a.style.height = a.scrollHeight + "px"; set(!item.classList.contains("open")); });
      if (idx === 0) set(true, true);
    });
  }

  /* ───────── Modal ───────── */
  let lastFocus = null;
  core.openModal = (html) => {
    const m = $("#modal"); if (!m) return;
    lastFocus = document.activeElement;
    $("#modalBody").innerHTML = html; m.hidden = false; core.lenis?.stop();
    $(".modal-close", m)?.focus();
  };
  core.closeModal = () => { const m = $("#modal"); if (!m || m.hidden) return; m.hidden = true; core.lenis?.start(); lastFocus?.focus(); };

  /* ───────── Nav ───────── */
  core.scrollTo = (el, off = -80) => { if (!el) return; if (core.lenis) core.lenis.scrollTo(el, { offset: off, duration: 1.3 }); else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); };
  function initNav() {
    const header = $("#siteHeader"), btn = $("#menuBtn"), nav = $("#navLinks");
    const set = (o) => { nav?.classList.toggle("open", o); btn?.setAttribute("aria-expanded", String(o)); btn?.setAttribute("aria-label", o ? "Fechar menu" : "Abrir menu"); };
    btn?.addEventListener("click", (e) => { e.stopPropagation(); set(!nav.classList.contains("open")); });
    document.addEventListener("click", (e) => { if (nav?.classList.contains("open") && !nav.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); core.closeModal(); } });
    $("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.closest("[data-close]")) core.closeModal(); });
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", (e) => { const id = a.getAttribute("href"); if (id.length < 2) return; const el = $(id); if (!el) return; e.preventDefault(); set(false); core.scrollTo(el); }));
    let lastY = 0;
    const onScroll = (y) => { header?.classList.toggle("scrolled", y > 20); header?.classList.toggle("hide", y > lastY && y > 700 && !nav?.classList.contains("open")); lastY = y; };
    if (core.lenis) core.lenis.on("scroll", ({ scroll }) => onScroll(scroll)); else addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    const links = $$(".nav-link");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach(en => { if (en.isIntersecting) links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id)); }), { rootMargin: "-45% 0px -50% 0px" });
      links.forEach(l => { const s = $(l.getAttribute("href")); if (s) io.observe(s); });
    }
  }

  /* ───────── Split text ───────── */
  core.splitWords = (el, cls = "w") => {
    const nodes = [...el.childNodes]; el.innerHTML = "";
    nodes.forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(part => { if (!part) return; if (/^\s+$/.test(part)) el.appendChild(document.createTextNode(" ")); else { const w = document.createElement("span"); w.className = cls; w.innerHTML = `<span>${part}</span>`; el.appendChild(w); } });
      else { const w = document.createElement("span"); w.className = cls; const i = document.createElement("span"); i.appendChild(n); w.appendChild(i); el.appendChild(w); }
    });
    return $$(`.${cls} > span`, el);
  };

  /* ───────── Motion ───────── */
  function initMotion() {
    if (!hasGSAP() || reduceMotion) { $("#preloader")?.remove(); document.documentElement.classList.add("no-motion"); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (typeof Lenis !== "undefined") {
      core.lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      core.lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => core.lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    // generic reveals
    $$(".reveal").forEach(el => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
    $$(".reveal-img").forEach(el => gsap.fromTo(el, { clipPath: "inset(14% 14% 14% 14% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } }));
    $$("[data-parallax]").forEach(img => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } }));
    $$("[data-count]").forEach(el => { const target = +el.dataset.count, dec = +(el.dataset.decimals || 0); const o = { v: 0 }; gsap.to(o, { v: target, duration: 1.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => { el.textContent = o.v.toFixed(dec).replace(".", ","); } }); });
    // magnetic + cursor
    if (!isTouch) {
      $$(".magnetic").forEach(b => {
        const inner = b.querySelector("span");
        b.addEventListener("mousemove", (e) => { const r = b.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35; gsap.to(b, { x, y, duration: 0.4, ease: "power3.out" }); if (inner) gsap.to(inner, { x: x * 0.4, y: y * 0.4, duration: 0.4 }); });
        b.addEventListener("mouseleave", () => gsap.to([b, inner].filter(Boolean), { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" }));
      });
      const cur = $(".cursor");
      if (cur) {
        const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" }), yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
        addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });
        document.addEventListener("mouseover", (e) => cur.classList.toggle("big", !!e.target.closest("a, button, [data-cursor]")));
      }
    }
    // site-specific choreography
    S.motion?.(core);
    addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ───────── Boot ───────── */
  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-wa]").forEach(a => { a.href = waLink(a.dataset.wa); a.target = "_blank"; a.rel = "noopener"; });
    renderStatus(); renderHours(); setInterval(renderStatus, 60000);
    S.render?.(core);
    initBooking();
    initMotion();
    initNav();
    initFaq();
    $$("[data-year]").forEach(y => (y.textContent = new Date().getFullYear()));
    setTimeout(() => { if (core.intro && core.intro.progress() < 1) core.intro.progress(1); $("#preloader")?.remove(); core.lenis?.start(); }, 5000);
  });
})();
