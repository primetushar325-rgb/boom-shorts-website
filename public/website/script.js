// Mihad Boom Shorts — Smooth & Fast JS
// Minimal animations, max performance

// Counter animation
let counted = false;
function animateCounters() {
  if (counted) return;
  counted = true;
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.getAttribute('data-target');
    if (!target) return;
    let i = 0;
    const step = target / 45;
    const t = setInterval(() => {
      i += step;
      if (i >= target) { i = target; clearInterval(t); }
      el.textContent = target >= 1000
        ? Math.floor(i).toLocaleString() + '+'
        : Math.floor(i) + (target === 100 ? '%' : '+');
    }, 28);
  });
}

const stats = document.querySelector('.stats');
if (stats && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(e => {
    e.forEach(x => { if (x.isIntersecting) { animateCounters(); io.disconnect(); } });
  }, { threshold: 0.3 });
  io.observe(stats);
} else {
  animateCounters();
}

// Countdown timer
(function () {
  const ids = ['d', 'h', 'm', 's'];
  if (!ids.every(id => document.getElementById(id))) return;

  let end = localStorage.getItem('mbs_offer_end');
  if (!end) {
    end = new Date(Date.now() + 3 * 86400000).toISOString();
    localStorage.setItem('mbs_offer_end', end);
  }
  const target = new Date(end).getTime();

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) { localStorage.removeItem('mbs_offer_end'); return; }
    document.getElementById('d').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    document.getElementById('h').textContent = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
    document.getElementById('m').textContent = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
    document.getElementById('s').textContent = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
})();

// Smooth anchor scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const t = document.querySelector(this.getAttribute('href'));
    if (t) {
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const nav = document.getElementById('nav');
      if (nav) nav.classList.remove('open');
    }
  });
});

// Scroll reveal — very light
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('show');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  const s = document.createElement('style');
  s.textContent = '.pack-card,.review-card,.video-card{opacity:0;transform:translateY(18px);transition:opacity .45s ease,transform .45s ease}.pack-card.show,.review-card.show,.video-card.show{opacity:1;transform:none}';
  document.head.appendChild(s);

  document.querySelectorAll('.pack-card, .review-card, .video-card').forEach(el => io.observe(el));
}
