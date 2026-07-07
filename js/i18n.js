(function() {
  'use strict';
  const supportedLanguages = ["ko","en","zh","hi","ru","ja","es","pt","id","tr","de","fr"];
  const fallback = 'en';
  const state = { lang: fallback, translations: {} };

  function detectLanguage() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const urlLang = params.get('lang');
      if (urlLang && supportedLanguages.includes(urlLang)) return urlLang;
      const saved = localStorage.getItem('app_language');
      if (saved && supportedLanguages.includes(saved)) return saved;
      const browser = (navigator.language || fallback).split('-')[0];
      if (supportedLanguages.includes(browser)) return browser;
    } catch (error) {}
    return fallback;
  }

  function getValue(key) {
    const keys = key.split('.');
    let value = state.translations;
    for (let i = 0; i < keys.length; i += 1) {
      if (!value || typeof value !== 'object') return null;
      value = value[keys[i]];
    }
    return typeof value === 'string' ? value : null;
  }

  async function load(lang) {
    try {
      const response = await fetch('js/locales/' + lang + '.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Missing locale');
      state.translations = await response.json();
      state.lang = lang;
      document.documentElement.lang = lang;
      return true;
    } catch (error) {
      if (lang !== fallback) return load(fallback);
      return false;
    }
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      const value = getValue(el.getAttribute('data-i18n'));
      if (value) el.textContent = value;
    });
    const title = getValue('app.title');
    if (title) document.title = title + ' | DopaBrain';
    const description = getValue('app.description');
    const meta = document.querySelector('meta[name="description"]');
    if (description && meta) meta.setAttribute('content', description);
    const selector = document.getElementById('language-select');
    if (selector) selector.value = state.lang;
  }

  async function setLanguage(lang) {
    if (!supportedLanguages.includes(lang)) return false;
    await load(lang);
    try { localStorage.setItem('app_language', state.lang); } catch (error) {}
    apply();
    return true;
  }

  window.i18n = { init: setLanguage, setLanguage: setLanguage, getLanguage: function(){ return state.lang; } };

  document.addEventListener('DOMContentLoaded', function() {
    try {
      setLanguage(detectLanguage()).catch(function(){});
    } catch (error) {}
  });
})();
