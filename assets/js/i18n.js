'use strict';

const i18n = (() => {
  let translations = {};
  let currentLang = 'es';

  async function init() {
    try {
      const response = await fetch('assets/data/translations.json');
      translations = await response.json();

      currentLang = localStorage.getItem('lang') || detectBrowserLang() || 'es';
      localStorage.setItem('lang', currentLang);

      document.documentElement.lang = currentLang;
      document.documentElement.setAttribute('data-lang', currentLang);
      updateMetaTags();
    } catch (err) {
      console.error('Error cargando traducciones:', err);
      currentLang = 'es';
    }
    return currentLang;
  }

  function detectBrowserLang() {
    const base = (navigator.language || navigator.userLanguage || '').split('-')[0];
    return ['es', 'en'].includes(base) ? base : 'es';
  }

  function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
      if (value && typeof value === 'object') value = value[k];
      else return key;
    }
    return typeof value === 'string' ? value : key;
  }

  function setLang(lang) {
    if (!['es', 'en'].includes(lang)) lang = 'es';
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);
    updateMetaTags();
  }

  function getLang() { return currentLang; }

  function updateMetaTags() {
    const meta = translations[currentLang]?.meta || {};
    if (meta.title) document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && meta.description) desc.content = meta.description;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && meta.og_title) ogTitle.content = meta.og_title;
  }

  function translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated === key) return;
      if (el.getAttribute('data-i18n-html')) {
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    });
  }

  function switchLang(newLang) {
    if (newLang === currentLang) return;
    document.body.style.opacity = '0.6';
    document.body.style.transition = 'opacity .2s ease';
    setTimeout(() => {
      setLang(newLang);
      translateDOM();
      document.body.style.opacity = '1';
    }, 200);
  }

  return { init, t, setLang, getLang, translateDOM, switchLang };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await i18n.init();
    i18n.translateDOM();
  });
} else {
  i18n.init().then(() => i18n.translateDOM());
}
