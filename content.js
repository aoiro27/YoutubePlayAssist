(() => {
  "use strict";
  const { parseTime, formatTime, validRange } = globalThis.YouTubePlayAssistUtils;
  let active = null;
  let pageKey = "";

  function mount(player, video, controls) {
    const host = document.createElement("div");
    host.id = "youtube-play-assist";
    host.lang = "en";
    host.style.cssText = "position:relative;display:inline-flex;align-items:center;height:100%;vertical-align:top;margin:0 4px;flex-shrink:0;";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host{font-family:system-ui,sans-serif;color:#f8fafc;font-size:13px;line-height:1.4;color-scheme:dark}
        *{box-sizing:border-box}section{position:absolute;bottom:calc(100% + 12px);left:0;width:290px;max-width:calc(100vw - 48px);background:rgba(15,23,42,.97);border:1px solid #64748b;border-radius:12px;box-shadow:0 6px 24px #0006;overflow:hidden}
        header{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;gap:12px}strong{font-size:12px;letter-spacing:.03em}
        .body{padding:0 10px 10px}.row{display:flex;align-items:center;gap:6px;margin-top:8px}label{display:flex;align-items:center;gap:6px}button,select,input{font:inherit;border:1px solid #64748b;border-radius:6px;background:#1e293b;color:#f8fafc;min-height:30px}
        button{cursor:pointer;padding:4px 8px}button:hover{background:#334155}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
        select{padding:3px}input{width:87px;padding:4px 6px}header button{min-height:24px;padding:0 7px}.seek button{flex:1}.range{justify-content:space-between}.range button{font-size:12px}
        #loop{flex:1;background:#075985}#loop[aria-pressed="true"]{background:#047857}#status{margin:8px 0 0;font-size:11px;color:#cbd5e1;min-height:16px;overflow-wrap:anywhere}[hidden]{display:none!important}
        .toolbar{display:flex;align-items:center;height:32px;max-height:100%;gap:2px;padding:2px 6px;border-radius:999px;background:rgba(28,28,28,.85);box-shadow:0 1px 4px #0005;backdrop-filter:blur(8px)}.toolbar button,.toolbar select{border:0;background:transparent;border-radius:999px;height:100%;min-height:0;padding:0 6px;color:white;text-shadow:0 1px 2px #000;font-size:13px}.toolbar button:hover,.toolbar select:hover{background:#ffffff26}.toolbar select{width:62px;padding:0 2px}.toolbar option{background:#1e293b}.toolbar #menu[data-active="true"]{color:#6ee7b7}.toolbar #menu[aria-expanded="true"]{background:#ffffff26}
        @media(max-width:700px){.toolbar button{padding:0 3px;font-size:11px}.toolbar select{width:51px;font-size:11px}}
      </style>
      <div class="toolbar" role="group" aria-label="YouTube playback controls">
        <button id="back" title="Rewind 10 seconds" aria-label="Rewind 10 seconds">↶10</button>
        <button id="forward" title="Forward 10 seconds" aria-label="Forward 10 seconds">10↷</button>
        <select id="speed" title="Playback speed" aria-label="Playback speed">${[0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.5,3,4].map(rate => `<option value="${rate}">${rate}×</option>`).join("")}</select>
        <button id="menu" title="A–B loop settings" aria-label="A–B loop settings" aria-expanded="false" aria-haspopup="dialog">A↔B</button>
      </div>
      <section id="panel" role="dialog" aria-label="A–B loop settings" hidden>
        <header><strong>A–B loop</strong><button id="collapse" aria-label="Close settings">×</button></header>
        <div class="body" id="body">
          <div class="row range"><label>Start <input id="start" type="text" value="0:00" aria-label="Loop start time" spellcheck="false"></label><button id="setStart">Use current time</button></div>
          <div class="row range"><label>End <input id="end" type="text" placeholder="1:00" aria-label="Loop end time" spellcheck="false"></label><button id="setEnd">Use current time</button></div>
          <div class="row"><button id="loop" aria-pressed="false">Enable loop</button><button id="reset">Disable</button></div>
          <p id="status" role="status" aria-live="polite">Enter time as m:ss or h:mm:ss.</p>
        </div>
      </section>`;
    // Native control containers can clip overflow. Render the settings as a
    // sibling of those containers, while keeping toolbar buttons in the bar.
    const panelHost = document.createElement("div");
    panelHost.id = "youtube-play-assist-panel";
    panelHost.lang = "en";
    panelHost.style.cssText = "position:absolute;inset:0;z-index:80;pointer-events:none;";
    panelHost.hidden = true;
    const panelShadow = panelHost.attachShadow({ mode: "open" });
    panelShadow.append(shadow.querySelector("style").cloneNode(true), shadow.getElementById("panel"));
    const $ = id => shadow.getElementById(id) || panelShadow.getElementById(id);
    $("panel").style.pointerEvents = "auto";
    function positionPanel() {
      if (panelHost.hidden) return;
      const bounds = player.getBoundingClientRect();
      const button = $("menu").getBoundingClientRect();
      const bar = controls.getBoundingClientRect();
      const panel = $("panel");
      panel.style.maxWidth = `${Math.max(0, bounds.width - 16)}px`;
      panel.style.maxHeight = `${Math.max(0, bar.top - bounds.top - 16)}px`;
      panel.style.overflowY = "auto";
      panel.style.left = `${Math.max(8, Math.min(button.left - bounds.left, bounds.width - panel.offsetWidth - 8))}px`;
      panel.style.bottom = `${Math.max(8, bounds.bottom - bar.top + 8)}px`;
    }
    let looping = false;
    let start = 0;
    let end = 0;
    const status = message => { $("status").textContent = message; };
    function stop(message) {
      looping = false;
      $("loop").setAttribute("aria-pressed", "false");
      $("loop").textContent = "Enable loop";
      $("menu").dataset.active = "false";
      if (message) status(message);
    }
    function seek(offset) {
      if (!Number.isFinite(video.duration)) return status("Seeking is unavailable for this video.");
      stop("Seeked. A–B loop disabled.");
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));
    }
    $("back").onclick = () => seek(-10);
    $("forward").onclick = () => seek(10);
    $("speed").onchange = () => { video.playbackRate = Number($("speed").value); };
    const syncSpeed = () => {
      const value = String(video.playbackRate);
      if (![...$("speed").options].some(option => option.value === value)) {
        $("speed").add(new Option(`${value}×`, value));
      }
      $("speed").value = value;
    };
    for (const [button, input] of [["setStart", "start"], ["setEnd", "end"]]) {
      $(button).onclick = () => {
        stop();
        $(input).value = formatTime(video.currentTime);
        status("Set the start and end times, then enable looping.");
      };
    }
    for (const id of ["start", "end"]) $(id).oninput = () => stop("Range updated. Enable looping to apply.");
    $("loop").onclick = () => {
      if (looping) return stop("A–B loop stopped.");
      start = parseTime($("start").value);
      end = parseTime($("end").value);
      if (!validRange(start, end, video.duration)) {
        return status("Enter valid times within the video. End must be after start.");
      }
      looping = true;
      $("loop").setAttribute("aria-pressed", "true");
      $("loop").textContent = "Disable loop";
      $("menu").dataset.active = "true";
      status(`Looping ${formatTime(start)} – ${formatTime(end)}`);
      video.currentTime = start;
    };
    $("reset").onclick = () => stop("A–B loop disabled.");
    const showPanel = open => {
      panelHost.hidden = !open;
      $("panel").hidden = !open;
      $("menu").setAttribute("aria-expanded", String(open));
      if (open) positionPanel();
    };
    $("menu").onclick = () => showPanel($("panel").hidden);
    $("collapse").onclick = () => { showPanel(false); $("menu").focus(); };
    const onOutsideClick = event => {
      const path = event.composedPath();
      if (!path.includes(host) && !path.includes(panelHost)) showPanel(false);
    };
    const onEscape = event => {
      if (event.key === "Escape" && !$("panel").hidden) {
        event.preventDefault();
        showPanel(false);
        $("menu").focus();
      }
    };
    host.addEventListener("keydown", onEscape);
    panelHost.addEventListener("keydown", onEscape);
    document.addEventListener("click", onOutsideClick);
    // Prevent YouTube's player shortcuts from consuming input and button events.
    for (const event of ["keydown", "keyup", "keypress", "click", "dblclick", "pointerdown"]) {
      host.addEventListener(event, e => e.stopPropagation());
      panelHost.addEventListener(event, e => e.stopPropagation());
    }
    function tick() {
      if (!looping) return;
      if (!validRange(start, end, video.duration)) return stop("Video changed. A–B loop disabled.");
      if (video.currentTime >= end || video.currentTime < start) {
        const wasEnded = video.ended;
        video.currentTime = start;
        if (wasEnded) video.play().catch(() => status("Press play to resume looping."));
      }
    }
    const onEnded = () => {
      if (looping) {
        video.currentTime = start;
        video.play().catch(() => status("Press play to resume looping."));
      }
    };
    const onSourceChange = () => stop("Video changed. A–B loop disabled.");
    video.addEventListener("ratechange", syncSpeed);
    video.addEventListener("timeupdate", tick);
    video.addEventListener("ended", onEnded);
    video.addEventListener("emptied", onSourceChange);
    const timer = setInterval(tick, 80);
    controls.append(host);
    player.append(panelHost);
    const resizeObserver = new ResizeObserver(positionPanel);
    resizeObserver.observe(player);
    resizeObserver.observe(controls);
    syncSpeed();
    return { player, video, host, panelHost, controls, cleanup() {
      clearInterval(timer);
      resizeObserver.disconnect();
      document.removeEventListener("click", onOutsideClick);
      video.removeEventListener("ratechange", syncSpeed);
      video.removeEventListener("timeupdate", tick);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("emptied", onSourceChange);
      host.remove();
      panelHost.remove();
    } };
  }

  function reconcile() {
    const url = new URL(location.href);
    const key = url.pathname === "/watch" ? url.searchParams.get("v") : null;
    const player = key ? document.querySelector("#movie_player") : null;
    const video = player?.querySelector("video.html5-main-video");
    const controls = player?.querySelector(".ytp-left-controls");
    if (active && (key !== pageKey || player !== active.player || video !== active.video || controls !== active.controls || !active.host.isConnected || !active.panelHost.isConnected)) {
      active.cleanup();
      active = null;
    }
    pageKey = key;
    if (!active && player && video && controls) active = mount(player, video, controls);
  }
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; reconcile(); });
  };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("popstate", schedule);
  reconcile();
})();
