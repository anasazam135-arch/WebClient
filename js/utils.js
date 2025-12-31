function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}

function formatDuration(iso) {
  if (!iso) return "0:00";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalMinutes = hours * 60 + minutes;
  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${totalMinutes}:${paddedSeconds}`;
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function setQueryParam(key, value, usePush) {
  const params = new URLSearchParams(window.location.search);
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
  if (usePush) {
    window.history.pushState({}, "", next);
  } else {
    window.history.replaceState({}, "", next);
  }
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
}

function buildVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// function buildEmbedUrl(videoId) {
//   if (!videoId) return "";
//   const origin = window.location.origin;
//   const originParam = origin && origin !== "null" ? `&origin=${encodeURIComponent(origin)}` : "";
//   return `https://www.youtube.com/embed/${videoId}?autoplay=1${originParam}`;
// }
function buildEmbedUrl(videoId) {
  const url = new URL("https://www.youtube.com/embed/" + encodeURIComponent(videoId));
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("playsinline", "1");
  return url.toString();
}


function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
