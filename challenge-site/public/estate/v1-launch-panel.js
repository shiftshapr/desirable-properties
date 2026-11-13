/*
 * Desirable Properties Version 1.0 launch panel, for any estate site.
 *
 *   <div data-dp-v1-panel></div>
 *   <script src="https://desirableproperties.org/estate/v1-launch-panel.js" defer></script>
 *
 * Before 10am PT on Friday 13 November 2026: the launch and free registration.
 * During the launch (10–11am PT): Version 1.0 is live, join now, read or download.
 * From 11am PT: Version 1.0 released, read online or download the PDF (no launch call to action).
 * Switches on the clock without a reload. Staging hosts and localhost can preview with ?v1phase=before|during|after.
 * Rendered in a shadow root, so the host site's CSS doesn't touch it. Optional on the mount:
 *   data-site="The Overweb"   names the host site in the analytics source parameter
 */
(function () {
  'use strict';
  var LAUNCH_AT = Date.parse('2026-11-13T18:00:00Z');
  var END_AT = Date.parse('2026-11-13T19:00:00Z');
  var DP = 'https://desirableproperties.org';
  var READ = 'https://book.desirableproperties.org/';
  var PDF = DP + '/downloads/desirable-properties-v1.0.pdf';
  var REGISTER = 'https://bit.ly/dp-nov-13';
  var COVER = 'https://book.desirableproperties.org/assets/cover.webp';

  function phase() {
    var h = location.hostname;
    if (/^(staging\.|localhost|127\.)/.test(h)) {
      var p = new URLSearchParams(location.search).get('v1phase');
      if (p === 'before' || p === 'during' || p === 'after') return p;
    }
    var t = Date.now();
    return t < LAUNCH_AT ? 'before' : t < END_AT ? 'during' : 'after';
  }

  var COPY = {
    before: {
      kicker: 'Version 1.0 · releases Friday',
      lead: 'Twenty-four properties for the layered web, written in the open over two years. The launch is Friday, November 13, 2026, 10–11 AM PT, live on Zoom.',
      primary: ['Join the launch: register free', REGISTER],
      secondary: ['Read the book online', READ]
    },
    during: {
      kicker: 'Version 1.0 is live',
      lead: 'The Desirable Properties of a Meta-Layer, Version 1.0, is out. The launch gathering is live on Zoom now, until 11 AM PT.',
      primary: ['Join the launch now', REGISTER],
      secondary: ['Read online', READ],
      tertiary: ['Download the PDF', PDF]
    },
    after: {
      kicker: 'Version 1.0 · released November 13, 2026',
      lead: 'Twenty-four properties for the layered web, written in the open over two years. Read it online, with a discussion layer on every page, or download the PDF.',
      primary: ['Read online', READ],
      secondary: ['Download the PDF', PDF],
      tertiary: ['About Version 1.0', DP + '/v1']
    }
  };

  var CSS =
    ':host{display:block;all:initial}' +
    '.p{box-sizing:border-box;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e2e8f0;' +
    'background:linear-gradient(90deg,#020617,#0f172a 55%,rgba(69,26,3,.55));border:1px solid rgba(251,191,36,.45);' +
    'border-radius:16px;padding:20px;display:flex;gap:20px;align-items:center;max-width:1120px;margin:16px auto}' +
    '.p *{box-sizing:border-box}' +
    'img{width:96px;height:auto;border-radius:6px;box-shadow:0 10px 30px rgba(0,0,0,.6);flex:none}' +
    '.k{margin:0;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#fcd34d}' +
    'h2{margin:4px 0 0;font-size:22px;line-height:1.25;color:#fff;font-weight:700}' +
    '.l{margin:8px 0 0;color:#cbd5e1;max-width:46rem}' +
    '.a{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}' +
    'a{display:inline-flex;align-items:center;border-radius:10px;padding:9px 16px;font-size:14px;font-weight:600;text-decoration:none}' +
    'a.b1{background:#f59e0b;color:#0f172a;border:2px solid #fcd34d}a.b1:hover{background:#fbbf24}' +
    'a.b2{background:#1e293b;color:#fff}a.b2:hover{background:#334155}' +
    'a.b3{color:#fde68a;padding-left:4px}a.b3:hover{color:#fef3c7}' +
    '@media (max-width:560px){.p{flex-direction:column;align-items:flex-start}img{width:80px}}';

  function render(host, ph) {
    var c = COPY[ph];
    var site = host.getAttribute('data-site') || location.hostname;
    var tag = function (u) {
      if (u.indexOf(DP) !== 0 && u.indexOf(READ) !== 0) return u;
      return u + (u.indexOf('?') < 0 ? '?' : '&') + 'utm_source=' + encodeURIComponent(site) + '&utm_medium=v1-panel';
    };
    var btn = function (pair, cls) {
      if (!pair) return '';
      var dl = pair[1] === PDF ? ' download' : '';
      return '<a class="' + cls + '" href="' + tag(pair[1]) + '"' + dl + '>' + pair[0] + '</a>';
    };
    host.__dpRoot.innerHTML =
      '<style>' + CSS + '</style><section class="p" aria-label="Desirable Properties Version 1.0">' +
      '<a href="' + tag(READ) + '" style="padding:0"><img src="' + COVER + '" alt="Cover of The Desirable Properties of a Meta-Layer, Version 1.0"></a>' +
      '<div><p class="k">' + c.kicker + '</p><h2>The Desirable Properties of a Meta-Layer</h2><p class="l">' + c.lead + '</p>' +
      '<div class="a">' + btn(c.primary, 'b1') + btn(c.secondary, 'b2') + btn(c.tertiary, 'b3') + '</div></div></section>';
    host.__dpPhase = ph;
  }

  function mountAll() {
    var hosts = document.querySelectorAll('[data-dp-v1-panel]');
    for (var i = 0; i < hosts.length; i++) {
      var h = hosts[i];
      if (!h.__dpRoot) h.__dpRoot = h.attachShadow ? h.attachShadow({ mode: 'open' }) : h;
      var ph = phase();
      if (h.__dpPhase !== ph) render(h, ph);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
  setInterval(mountAll, 30000);
})();
