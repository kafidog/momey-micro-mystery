(() => {
  'use strict';

  const body = document.body;
  const source = body.dataset.source || 'unknown';
  const params = new URLSearchParams(location.search);
  const internalMode = params.get('internal') === '1';
  const qaMode = params.get('qa') === '1';
  const GA_ID = window.MOMEY_GA_MEASUREMENT_ID || '';
  const gaReady = /^G-[A-Z0-9]+$/i.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX';
  const COUNTER_URL = window.MOMEY_EVIDENCE_COLLECTOR_URL || '';
  const counterReady = /^https:\/\/[^/]+\.workers\.dev\/collect$/i.test(COUNTER_URL);

  const prefix = qaMode ? 'qa_' : 'sr_';
  const state = {
    group: sessionStorage.getItem('momey_sr_group_choice') || null,
    pull: sessionStorage.getItem('momey_sr_pull_choice') || null,
  };

  function initAnalytics() {
    if (internalMode || !gaReady) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };

    // Privacy-minimizing default: no ad storage/personalization and no GA cookie storage.
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true,
      debug_mode: qaMode
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);
  }

  function aggregateEvent(eventName) {
    if (internalMode || !counterReady) return;
    void fetch(COUNTER_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      keepalive: true,
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      body: JSON.stringify({source, event_name: eventName})
    }).catch(() => {});
  }

  function event(name) {
    if (internalMode) return;
    const eventName = `${prefix}${name}`;
    aggregateEvent(eventName);
    if (!gaReady || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, {
      source,
      debug_mode: qaMode
    });
  }

  function firstVisitEvent() {
    const key = `momey_${prefix}valid_visit_sent`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      event('valid_visit');
    }
  }

  function selectButtons(groupName, value) {
    const buttons = [...document.querySelectorAll(`[data-${groupName}]`)];
    buttons.forEach(btn => {
      const v = btn.dataset[groupName];
      btn.disabled = true;
      btn.classList.toggle('selected', v === value);
      btn.setAttribute('aria-pressed', v === value ? 'true' : 'false');
    });
  }

  function revealAfterGroup(value) {
    document.querySelector('#concept-step').hidden = value === 'solo_browse';
    document.querySelector('#final-step').hidden = value !== 'solo_browse' && !state.pull;
    if (value === 'solo_browse') document.querySelector('#final-step').hidden = false;
  }

  function chooseGroup(value) {
    if (state.group) return;
    state.group = value;
    sessionStorage.setItem('momey_sr_group_choice', value);
    selectButtons('group', value);
    event(value);
    revealAfterGroup(value);
    const target = value === 'solo_browse' ? '#final-step' : '#concept-step';
    document.querySelector(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function choosePull(value) {
    if (!state.group || state.group === 'solo_browse' || state.pull) return;
    state.pull = value;
    sessionStorage.setItem('momey_sr_pull_choice', value);
    selectButtons('pull', value);
    event(value);
    document.querySelector('#final-step').hidden = false;
    document.querySelector('#final-step')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function restore() {
    if (state.group) {
      selectButtons('group', state.group);
      revealAfterGroup(state.group);
    }
    if (state.pull) {
      selectButtons('pull', state.pull);
      document.querySelector('#concept-step').hidden = false;
      document.querySelector('#final-step').hidden = false;
    }
  }

  document.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => chooseGroup(btn.dataset.group));
  });
  document.querySelectorAll('[data-pull]').forEach(btn => {
    btn.addEventListener('click', () => choosePull(btn.dataset.pull));
  });

  if (internalMode || qaMode) {
    const badge = document.querySelector('#mode-badge');
    if (badge) {
      badge.textContent = internalMode ? 'INTERNAL · analytics off' : 'QA · qa_* events';
      badge.classList.add('show');
    }
  }

  initAnalytics();
  restore();
  firstVisitEvent();
})();
