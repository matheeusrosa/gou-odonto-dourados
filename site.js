/* GOU ODONTO — config + choreography (core.js does the rest) */
const GOU_PANELS = [
  { t: "Estética e clareamento", s: "Dentes mais claros e um sorriso harmônico, com planejamento e segurança.", img: "assets/woman.webp" },
  { t: "Lentes e facetas", s: "Corrija cor, formato e proporção com acabamento natural.", img: "assets/smile.webp" },
  { t: "Implantes e próteses", s: "Volte a mastigar com firmeza e sorrir com confiança.", img: "assets/senior.webp" },
  { t: "Clínica geral", s: "Check-up, limpeza e restaurações para manter tudo em dia.", img: "assets/man.webp" },
  { t: "Ortodontia", s: "Aparelhos e alinhadores para um sorriso alinhado.", img: "assets/room.webp" }
];

window.SITE = {
  brand: "GOU Odonto",
  cityLabel: "Dourados",
  whatsapp: "5567998845046",
  timeZone: "America/Campo_Grande",
  hours: { 1: [[9, 12], [14, 19]], 2: [[9, 12], [14, 19]], 3: [[9, 12], [14, 19]], 4: [[9, 12], [14, 19]], 5: [[9, 12], [14, 19]], 6: [[8, 12]] },
  slots: ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"],
  slotNote: (dw) => dw === 6 ? "Aos sábados atendemos das 08h às 12h." : "Seg a sex: 09h–12h e 14h–19h. Sujeito à confirmação.",
  treatments: ["Avaliação / check-up", ...GOU_PANELS.map(x => x.t), "Canal / dor de dente"],

  render(core) {
    const wrap = core.$("#panels");
    wrap.innerHTML = GOU_PANELS.map((x, i) => `
      <div class="panel ${i === 0 ? "active" : ""}" role="button" tabindex="0" aria-expanded="${i === 0}" data-i="${i}" data-cursor>
        <img src="${x.img}" alt="" loading="lazy" />
        <span class="panel-label">${x.t}</span>
        <div class="panel-body">
          <span class="panel-n">${String(i + 1).padStart(2, "0")}</span>
          <h3>${x.t}</h3>
          <p>${x.s}</p>
          <button type="button" class="btn btn-mint" data-book="${x.t}">Agendar avaliação</button>
        </div>
      </div>`).join("");
    const panels = core.$$(".panel", wrap);
    const activate = (p) => panels.forEach(x => { const on = x === p; x.classList.toggle("active", on); x.setAttribute("aria-expanded", String(on)); });
    panels.forEach(p => {
      p.addEventListener("mouseenter", () => { if (!core.isTouch && innerWidth > 900) activate(p); });
      p.addEventListener("click", (e) => { if (e.target.closest("[data-book]")) return; activate(p); });
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(p); } });
    });
    core.$$("[data-book]", wrap).forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); core.setTreatment(b.dataset.book); core.scrollTo(core.$("#agendar")); }));
  },

  motion(core) {
    const { $, $$ } = core;
    const words = core.splitWords($(".hero-title"));
    const tl = gsap.timeline({ delay: 0.1 });
    core.intro = tl;
    tl.from(".pill", { y: 20, opacity: 0, duration: 0.6, ease: "power3.out" })
      .from(words, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.06 }, "-=0.3")
      .from(".c-main", { clipPath: "inset(100% 0 0 0 round 30px)", duration: 1.4, ease: "expo.inOut" }, "-=1")
      .from(".c-small", { clipPath: "inset(0 100% 0 0 round 30px)", duration: 1.2, ease: "expo.inOut" }, "-=1")
      .from(".rating-chip", { scale: 0, rotate: -15, duration: 0.8, ease: "back.out(2)" }, "-=0.5")
      .from(".fade", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 }, "-=1.1")
      .from(".hero-bgword", { yPercent: 30, opacity: 0, duration: 1.6, ease: "expo.out" }, 0.2);

    gsap.to(".hero-bgword", { xPercent: -12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".c-main img", { yPercent: 10, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".c-small", { y: -60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".marquee-track", { xPercent: -10, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true } });

    gsap.from(".panel", { y: 80, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: ".panels", start: "top 80%" } });

    // manifesto: words light up in mint as you scroll
    const mw = core.splitWords($("#manifesto"), "mw");
    gsap.set(mw, { opacity: 0.18 });
    gsap.to(mw, { opacity: 1, stagger: 0.04, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top 70%", end: "center 45%", scrub: true } });

    gsap.from(".review-imgs img:first-child", { rotate: -18, x: -60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".review", start: "top 80%" } });
    gsap.from(".review-imgs img:last-child", { rotate: 18, x: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".review", start: "top 80%" } });
    gsap.fromTo(".footer-giant", { xPercent: 15 }, { xPercent: -8, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });
  }
};
