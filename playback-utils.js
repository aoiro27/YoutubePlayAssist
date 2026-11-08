(() => {
  const parseTime = (value) => {
    const text = String(value).trim();
    if (!/^\d+(?::[0-5]\d){0,2}(?:\.\d{1,3})?$/.test(text)) return NaN;
    return text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  };
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "";
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
  };
  const validRange = (start, end, duration) => Number.isFinite(start) && Number.isFinite(end)
    && start >= 0 && end > start && Number.isFinite(duration) && end <= duration;
  const api = { parseTime, formatTime, validRange };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.YouTubePlayAssistUtils = api;
})();
