document.addEventListener("DOMContentLoaded", () => {
  const images = window.SANKALP_IMAGES || { hero: [], campus: [], innovation: [] };

  function imageTile(item) {
    return `<figure class="track-tile"><img src="${item.url}" alt="" loading="eager"><figcaption>${item.category}</figcaption></figure>`;
  }

  const trackOne = document.getElementById("heroTrackOne");
  const trackTwo = document.getElementById("heroTrackTwo");
  if (trackOne && trackTwo) {
    const doubled = [...images.hero, ...images.hero];
    trackOne.innerHTML = doubled.map(imageTile).join("");
    trackTwo.innerHTML = [...doubled].reverse().map(imageTile).join("");
  }

  const campusGrid = document.getElementById("campusGrid");
  if (campusGrid) {
    campusGrid.innerHTML = images.campus.map((item, index) => `
      <article class="campus-card reveal ${index === 0 ? "campus-card-large" : ""}">
        <img src="${item.url}" alt="${item.title}" loading="lazy">
        <div class="campus-card-shade"></div>
        <div class="campus-card-copy"><span>${item.category}</span><h3>${item.title}</h3></div>
      </article>`).join("");
  }

  const innovationMedia = document.getElementById("innovationMedia");
  if (innovationMedia && images.innovation[0]) {
    innovationMedia.innerHTML = `<img src="${images.innovation[0].url}" alt="Students exploring robotics and technology" loading="lazy">`;
  }

  const skills = ["Artificial Intelligence", "Machine Learning", "Coding", "Web Development", "App Development", "Robotics", "IoT", "Drone Technology", "Digital Literacy", "Prompt Engineering", "Entrepreneurship", "Future Careers"];
  const skillCloud = document.getElementById("skillCloud");
  if (skillCloud) skillCloud.innerHTML = skills.map(skill => `<span>${skill}</span>`).join("");

  const reveals = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach(item => revealObserver.observe(item));

  const counters = document.querySelectorAll("[data-count]");
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.count);
      const startedAt = performance.now();
      const duration = 1100;
      function update(now) {
        const progress = Math.min((now - startedAt) / duration, 1);
        element.textContent = Math.floor(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      counterObserver.unobserve(element);
    });
  }, { threshold: 0.6 });
  counters.forEach(item => counterObserver.observe(item));

  const glow = document.querySelector(".hero-glow");
  const hero = document.querySelector(".cinematic-hero");
  if (glow && hero && window.matchMedia("(pointer:fine)").matches) {
    hero.addEventListener("pointermove", event => {
      glow.style.setProperty("--x", `${event.clientX}px`);
      glow.style.setProperty("--y", `${event.clientY}px`);
    });
  }

  const navbar = document.querySelector(".home-navbar");
  window.addEventListener("scroll", () => navbar?.classList.toggle("scrolled", window.scrollY > 40), { passive: true });

  const loader = document.querySelector(".page-loader");
  window.setTimeout(() => loader?.classList.add("loaded"), 550);
});
