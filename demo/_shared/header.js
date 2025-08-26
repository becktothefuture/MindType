/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O   H E A D E R   ( J S )  ░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Injects a responsive header with title, version and last-updated
  • WHY  ▸ Keep demos consistent and informative without manual duplication
  • HOW  ▸ Mounts on DOMContentLoaded; derives title from <title> or URL
*/

(function () {
  try {
    if (document.querySelector('.mt-header')) return;

    const version =
      document.querySelector('meta[name="mt-version"]')?.getAttribute('content') ||
      '0.0.0';
    const updated =
      document.querySelector('meta[name="mt-last-updated"]')?.getAttribute('content') ||
      document.lastModified ||
      new Date().toISOString();

    const titleTag = document.querySelector('title');
    const pageTitle = (
      titleTag?.textContent ||
      document.querySelector('[data-demo-title]')?.textContent ||
      document.body.getAttribute('data-demo-title') ||
      location.pathname.split('/').filter(Boolean).slice(-2).join(' / ') ||
      'Demo'
    ).trim();

    const header = document.createElement('header');
    header.className = 'mt-header';
    header.innerHTML = [
      '<div class="mt-header-inner">',
      '<div class="mt-header-left">',
      '<div class="mt-brand"><a href="/">Mind⠶Type</a></div>',
      '<div class="title-wrapper" aria-live="polite"></div>',
      '</div>',
      '<div class="mt-header-right">',
      '<span class="mt-badge" title="Project version"><span>v</span><code>' +
        escapeHtml(version) +
        '</code></span>',
      '<span class="mt-badge" title="Last updated"><span>Updated</span><code>' +
        escapeHtml(formatLocal(updated)) +
        '</code></span>',
      '</div>',
      '</div>',
    ].join('');

    document.body.prepend(header);

    const titleWrap = header.querySelector('.title-wrapper');
    if (titleWrap) {
      titleWrap.textContent = pageTitle;
    }

    function formatLocal(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  } catch (err) {
    // ⟢ Non-fatal: header injection should never break the demo
    console?.warn?.('[mt-header] failed to inject header', err);
  }
})();
