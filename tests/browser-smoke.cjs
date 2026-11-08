// Usage: node tests/browser-smoke.cjs /path/to/chromium
const { readFileSync, mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = join(__dirname, '..');
const directory = mkdtempSync(join(tmpdir(), 'play-assist-test-'));
const utils = readFileSync(join(root, 'playback-utils.js'), 'utf8');
const content = readFileSync(join(root, 'content.js'), 'utf8')
  .replace('new URL(location.href)', 'new URL("https://www.youtube.com/watch?v=test")');
const fixture = `<!doctype html><style>
  #movie_player{position:relative;width:640px;height:360px;background:black}
  .ytp-left-controls{position:absolute;bottom:0;left:0;width:100%;height:48px;overflow:hidden}
  video{width:100%;height:100%}
  </style><div id="movie_player"><video class="html5-main-video"></video><div class="ytp-left-controls"></div></div>
  <script>${utils}</script><script>${content}</script><script>
  try {
    const host = document.querySelector('#youtube-play-assist');
    const menu = host.shadowRoot.getElementById('menu');
    const panelHost = document.querySelector('#youtube-play-assist-panel');
    const panel = panelHost.shadowRoot.getElementById('panel');
    const check = (condition, message) => { if (!condition) throw Error(message); };
    check(panelHost.hidden, 'panel starts closed');
    menu.click();
    check(!panelHost.hidden && !panel.hidden, 'menu opens panel');
    const bounds = panel.getBoundingClientRect();
    const bar = host.parentElement.getBoundingClientRect();
    check(bounds.height > 100 && bounds.bottom <= bar.top, 'panel above clipped controls');
    check(document.elementFromPoint(bounds.left + 20, bounds.top + 20) === panelHost, 'panel visible and receives clicks');
    panelHost.shadowRoot.getElementById('start').click();
    check(!panelHost.hidden, 'interaction inside stays open');
    panelHost.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    check(panelHost.hidden && menu.getAttribute('aria-expanded') === 'false', 'Escape closes');
    menu.click(); menu.click();
    check(panelHost.hidden, 'second menu click closes');
    menu.click(); document.body.click();
    check(panelHost.hidden, 'outside click closes');
    document.body.dataset.test = 'passed';
  } catch (error) { document.body.dataset.test = error.message; }
  </script>`;
try {
  const file = join(directory, 'fixture.html');
  writeFileSync(file, fixture);
  const result = spawnSync(process.argv[2] || 'chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-background-networking',
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${join(directory, 'profile')}`,
    '--dump-dom', `file://${file}`
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /data-test="passed"/, result.stdout);
  console.log('Browser smoke test passed: clipping, hit testing, menu, Escape and outside click.');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
