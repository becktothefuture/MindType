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
  • HOW  ▸ Reads meta tags or __APP_VERSION__ defined by Vite
*/
(function(){
  try{
    if(document.querySelector('.mt-header')) return;

    const viteVersion = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) || undefined;
    const metaVersion = document.querySelector('meta[name="mt-version"]')?.getAttribute('content') || undefined;
    const version = viteVersion || metaVersion || '0.0.0';

    const metaUpdated = document.querySelector('meta[name="mt-last-updated"]')?.getAttribute('content') || undefined;
    const updated = metaUpdated || document.lastModified || new Date().toISOString();

    const titleTag = document.querySelector('title');
    const pageTitle = (titleTag?.textContent || document.querySelector('[data-demo-title]')?.textContent || document.body.getAttribute('data-demo-title') || location.pathname.split('/').filter(Boolean).slice(-2).join(' / ') || 'Demo').trim();

    const header = document.createElement('header');
    header.className = 'mt-header';
    header.innerHTML = [
      '<div class="mt-header-inner">',
        '<div class="mt-header-left">',
          '<div class="mt-brand"><a href="/">Mind⠶Type</a></div>',
          '<div class="title-wrapper" aria-live="polite"></div>',
        '</div>',
        '<div class="mt-header-right">',
          '<span class="mt-badge" title="Project version"><span>v</span><code>'+escapeHtml(version)+'</code></span>',
          '<span class="mt-badge" title="Last updated"><span>Updated</span><code>'+escapeHtml(formatLocal(updated))+'</code></span>',
        '</div>',
      '</div>'
    ].join('');

    document.body.prepend(header);
    const titleWrap = header.querySelector('.title-wrapper');
    if(titleWrap){ titleWrap.textContent = pageTitle; }

    function formatLocal(iso){
      const d = new Date(iso);
      if(Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    }
    function escapeHtml(str){
      return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    }
  }catch(err){
    console?.warn?.('[mt-header] failed to inject header', err);
  }
})();


