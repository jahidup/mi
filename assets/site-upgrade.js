document.addEventListener("DOMContentLoaded", () => {
  const route = window.location.pathname.replace(/^\/|\/$/g, "") || "home";
  const pageClass = `page-${route.replace(/\//g, "-")}`;
  document.body.classList.add("sankalp-premium", pageClass);

  const navbar = document.querySelector(".navbar");
  const updateNavbar = () => navbar?.classList.toggle("is-scrolled", window.scrollY > 20);
  updateNavbar();
  window.addEventListener("scroll", updateNavbar, { passive: true });

  document.querySelectorAll(".page-hero").forEach(hero => {
    if (!hero.querySelector(".hero-atmosphere")) {
      const atmosphere = document.createElement("div");
      atmosphere.className = "hero-atmosphere";
      atmosphere.setAttribute("aria-hidden", "true");
      atmosphere.innerHTML = "<i></i><i></i><i></i>";
      hero.prepend(atmosphere);
    }
  });

  const revealTargets = document.querySelectorAll(
    "body:not(.home-page) .section-header, body:not(.home-page) .feature-card, body:not(.home-page) .course-card, body:not(.home-page) .resource-card, body:not(.home-page) .faculty-card, body:not(.home-page) .value-card, body:not(.home-page) .stat-item, body:not(.home-page) .subject-card, body:not(.home-page) .stream-card, body:not(.home-page) .gallery-item, body:not(.home-page) .faq-item, body:not(.home-page) .info-item, body:not(.home-page) .card"
  );
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("site-revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealTargets.forEach((element, index) => {
    element.classList.add("site-reveal");
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
    revealObserver.observe(element);
  });

  document.querySelectorAll(".ai-floating-widget").forEach(widget => {
    widget.setAttribute("role", "link");
    widget.setAttribute("tabindex", "0");
    widget.setAttribute("aria-label", "Open Sankalp AI Assistant");
    widget.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") widget.click();
    });
  });

  document.querySelectorAll(".whatsapp-floating").forEach(link => {
    link.setAttribute("aria-label", "Chat with Sankalp Digital Pathshala on WhatsApp");
    link.setAttribute("rel", "noopener noreferrer");
  });

  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    link.setAttribute("rel", [...rel].join(" "));
  });

  const hamburger = document.getElementById("hamburger");
  if (hamburger && !hamburger.hasAttribute("aria-expanded")) hamburger.setAttribute("aria-expanded", "false");
});
