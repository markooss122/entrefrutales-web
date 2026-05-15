'use strict';

// ── Elements ──
const header = document.getElementById('header');
const reveals = document.querySelectorAll('.reveal');
const navLinks = document.querySelectorAll('.nav a');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const root = document.documentElement;
const loader = document.getElementById('loader');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const backTop = document.getElementById('backTop');
const scrollProgress = document.getElementById('scroll-progress');
const hero = document.getElementById('hero');

// ── Theme ──
const savedTheme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
root.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    themeIcon.innerHTML = '<circle cx="12" cy="12" r="5" stroke-width="1.8"/><line x1="12" y1="1" x2="12" y2="3" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke-width="1.8" stroke-linecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke-width="1.8" stroke-linecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke-width="1.8" stroke-linecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke-width="1.8" stroke-linecap="round"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke-width="1.8" stroke-linecap="round"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke-width="1.8" stroke-linecap="round"/>';
  } else {
    themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  }
}

// ── Loader ──
window.addEventListener('load', () => {
  setTimeout(() => {
    loader.classList.add('hidden');
    document.body.classList.remove('loading');
    startHeroCarousel();
  }, 1100);
});

// ── Hero carousel ──
function startHeroCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    slides[current].classList.add('leaving');
    dots[current]?.classList.remove('active');

    const prev = current;
    current = index;

    slides[current].classList.add('active');
    dots[current]?.classList.add('active');

    setTimeout(() => slides[prev].classList.remove('leaving'), 1700);
  }

  function next() {
    goTo((current + 1) % slides.length);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      clearInterval(timer);
      goTo(i);
      timer = setInterval(next, 5000);
    });
  });

  timer = setInterval(next, 5000);
}

// ── Scroll ──
const sections = ['casa', 'habitaciones', 'experiencia', 'opiniones', 'reserva', 'contacto'];

const onScroll = () => {
  const scrollY = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.width = (scrollY / docH * 100) + '%';

  header.classList.toggle('scrolled', scrollY > 30);
  backTop.classList.toggle('visible', scrollY > 600);

  let current = 'casa';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 140) current = id;
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
};

onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ── Reveal on scroll ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

reveals.forEach(el => observer.observe(el));

// ── Mobile menu ──
function closeMobileNav() {
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// ── Lightbox ──
const galleryItems = document.querySelectorAll('[data-lightbox]');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxCounter = document.getElementById('lightboxCounter');

let lightboxSources = [];
let currentLightboxIndex = 0;

galleryItems.forEach((item, i) => {
  lightboxSources.push({
    src: item.getAttribute('data-lightbox'),
    alt: item.querySelector('img').alt
  });

  item.addEventListener('click', () => {
    currentLightboxIndex = i;
    openLightbox();
  });
});

function openLightbox() {
  const { src, alt } = lightboxSources[currentLightboxIndex];
  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightboxCounter.textContent = (currentLightboxIndex + 1) + ' / ' + lightboxSources.length;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  document.body.style.overflow = '';
}

function prevImage() {
  currentLightboxIndex = (currentLightboxIndex - 1 + lightboxSources.length) % lightboxSources.length;
  openLightbox();
}

function nextImage() {
  currentLightboxIndex = (currentLightboxIndex + 1) % lightboxSources.length;
  openLightbox();
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', prevImage);
lightboxNext.addEventListener('click', nextImage);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') prevImage();
  if (e.key === 'ArrowRight') nextImage();
});


// ── Custom cursor ──
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.opacity = 1; ring.style.opacity = 1;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  const animateRing = () => {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  };
  animateRing();

  document.querySelectorAll('a, button, .gallery-item').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.style.width = '74px'; ring.style.height = '74px'; });
    el.addEventListener('mouseleave', () => { ring.style.width = '52px'; ring.style.height = '52px'; });
  });
}

// ── Lang switcher ──
(function() {
  const switcher = document.getElementById('langSwitcher');
  const btn = document.getElementById('langBtn');
  const dropdown = document.getElementById('langDropdown');
  const flagEl = document.getElementById('langFlag');
  const codeEl = document.getElementById('langCode');

  const FLAGS = { es: '🇪🇸', en: '🇬🇧' };

  function updateBtn(lang) {
    flagEl.textContent = FLAGS[lang];
    codeEl.textContent = lang.toUpperCase();
    dropdown.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });
  }

  // Init state from i18n (may load async, poll briefly)
  function syncBtn() {
    if (typeof i18n !== 'undefined') {
      updateBtn(i18n.getLang());
    } else {
      setTimeout(syncBtn, 50);
    }
  }
  syncBtn();

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = switcher.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });

  dropdown.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      i18n.switchLang(lang);
      updateBtn(lang);
      switcher.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
      switcher.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ── Cookie banner ──
(function() {
  const consent = localStorage.getItem('cookie-consent');
  if (consent) {
    document.getElementById('cookie-banner').classList.add('hidden');
  }
})();

function acceptCookies() {
  localStorage.setItem('cookie-consent', 'accepted');
  document.getElementById('cookie-banner').classList.add('hidden');
}

function rejectCookies() {
  localStorage.setItem('cookie-consent', 'rejected');
  document.getElementById('cookie-banner').classList.add('hidden');
}
