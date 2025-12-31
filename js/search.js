const user = requireAuth();
const userBadge = document.getElementById("userBadge");
const welcomeBadge = document.getElementById("welcomeBadge");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const resultsGrid = document.getElementById("resultsGrid");
const resultsMessage = document.getElementById("resultsMessage");
const apiNotice = document.getElementById("apiNotice");

const videoModal = document.getElementById("videoModal");
const videoFrame = document.getElementById("videoFrame");
const playlistModal = document.getElementById("playlistModal");
const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistField = document.getElementById("newPlaylistField");
const newPlaylistName = document.getElementById("newPlaylistName");
const playlistForm = document.getElementById("playlistForm");
const playlistVideoTitle = document.getElementById("playlistVideoTitle");
const playlistMessage = document.getElementById("playlistMessage");

let currentResults = [];
let pendingVideo = null;
let categoryMap = null;

if (user) {
  const displayName = user.firstName || user.username;
  userBadge.textContent = displayName;
  welcomeBadge.textContent = `Welcome ${displayName}`;
}

attachLogout("#logoutBtn");

bindModalDismiss(videoModal);
bindModalDismiss(playlistModal);

const apiReady = Boolean(YOUTUBE_API_KEY && YOUTUBE_API_KEY.trim());
apiNotice.hidden = apiReady;
const regionCode = (YOUTUBE_REGION || "US").toUpperCase();

function setMessage(message) {
  if (!message) {
    resultsMessage.hidden = true;
    resultsMessage.textContent = "";
    return;
  }
  resultsMessage.textContent = message;
  resultsMessage.hidden = false;
}

function getSavedPlaylists(videoId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  return currentUser.playlists
    .filter((playlist) => playlist.videos.some((video) => video.id === videoId))
    .map((playlist) => playlist.name);
}

function renderResults(videos, emptyMessage) {
  resultsGrid.innerHTML = "";
  if (!videos.length) {
    setMessage(emptyMessage || "No results yet. Try a new search.");
    return;
  }
  setMessage("");

  videos.forEach((video, index) => {
    const savedIn = getSavedPlaylists(video.id);
    const alreadySaved = savedIn.length > 0;
    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${index * 0.06}s`;

    const titleText = escapeHtml(video.title);
    const titleAttr = video.title.length > 46 ? `title="${titleText}"` : "";

    card.innerHTML = `
      <button class="link-button card-media" data-play data-id="${video.id}" aria-label="Play ${titleText}">
        <img src="${video.thumbnail}" alt="${titleText}">
      </button>
      <div class="card-body">
        <div class="card-title" ${titleAttr}>
          <button class="link-button" data-play data-id="${video.id}">${titleText}</button>
        </div>
        <div class="meta">
          <span>Channel: ${escapeHtml(video.channelTitle)}</span>
          <span>Duration: ${video.duration}</span>
          <span>Views: ${formatCount(video.viewCount)}</span>
          <span>Likes: ${formatCount(video.likeCount)}</span>
          <span>Genre: ${escapeHtml(video.category || "Unknown")}</span>
        </div>
        ${alreadySaved ? `<div class="helper">Saved in: ${escapeHtml(savedIn.join(", "))}</div>` : ""}
        <div class="card-actions">
          <button class="btn btn-ghost" data-play data-id="${video.id}" type="button">Play</button>
          <button class="btn ${alreadySaved ? "btn-muted" : "btn-primary"}" data-add data-id="${video.id}" type="button" ${alreadySaved ? "disabled" : ""}>Add to playlist</button>
        </div>
      </div>
    `;

    resultsGrid.appendChild(card);
  });
}

async function loadCategoryMap() {
  if (categoryMap) return categoryMap;
  try {
    const url = `${YOUTUBE_API_BASE}/videoCategories?part=snippet&regionCode=${encodeURIComponent(
      regionCode
    )}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Category request failed");
    const data = await response.json();
    categoryMap = {};
    data.items.forEach((item) => {
      categoryMap[item.id] = item.snippet.title;
    });
  } catch (err) {
    console.error(err);
    categoryMap = {};
  }
  return categoryMap;
}

function isAllowedInRegion(item) {
  const restriction = item.contentDetails && item.contentDetails.regionRestriction;
  if (!restriction) return true;
  if (restriction.blocked) {
    const blocked = restriction.blocked.map((code) => code.toUpperCase());
    if (blocked.includes(regionCode)) return false;
  }
  if (restriction.allowed) {
    const allowed = restriction.allowed.map((code) => code.toUpperCase());
    if (!allowed.includes(regionCode)) return false;
  }
  return true;
}

async function fetchVideos(query) {
  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=video&maxResults=12&videoEmbeddable=true&videoSyndicated=true&safeSearch=moderate&q=${encodeURIComponent(
    query
  )}&key=${encodeURIComponent(YOUTUBE_API_KEY)}&regionCode=${encodeURIComponent(regionCode)}`;

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error("Search request failed");
  }
  const searchData = await searchResponse.json();
  const ids = (searchData.items || [])
    .map((item) => item.id && item.id.videoId)
    .filter(Boolean);

  if (!ids.length) return [];

  const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails,status&id=${ids.join(",")}&key=${encodeURIComponent(
    YOUTUBE_API_KEY
  )}`;
  const detailResponse = await fetch(detailsUrl);
  if (!detailResponse.ok) {
    throw new Error("Details request failed");
  }

  const detailData = await detailResponse.json();
  const categories = await loadCategoryMap();

  return (detailData.items || [])
    .filter((item) => item.status && item.status.embeddable)
    .filter(isAllowedInRegion)
    .filter((item) => {
      const rating = item.contentDetails && item.contentDetails.contentRating;
      return !(rating && rating.ytRating === "ytAgeRestricted");
    })
    .map((item) => {
    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const content = item.contentDetails || {};

    return {
      id: item.id,
      title: snippet.title || "Untitled",
      channelTitle: snippet.channelTitle || "",
      thumbnail:
        (snippet.thumbnails && snippet.thumbnails.high && snippet.thumbnails.high.url) ||
        (snippet.thumbnails && snippet.thumbnails.medium && snippet.thumbnails.medium.url) ||
        "https://via.placeholder.com/320x180?text=No+Image",
      duration: formatDuration(content.duration),
      durationRaw: content.duration || "",
      viewCount: stats.viewCount || 0,
      likeCount: stats.likeCount || 0,
      category: categories[snippet.categoryId] || "Unknown",
      publishedAt: snippet.publishedAt || ""
    };
  });
}

async function performSearch(query, pushHistory) {
  if (!query) {
    setMessage("Type a search term to begin.");
    resultsGrid.innerHTML = "";
    return;
  }

  if (!apiReady) {
    setMessage("Add your YouTube API key to enable search.");
    return;
  }

  setMessage("Searching...");
  setLastSearch(query);
  setQueryParam("q", query, pushHistory);

  try {
    currentResults = await fetchVideos(query);
    if (!currentResults.length) {
      renderResults([], "No embeddable videos found. Try another search.");
      return;
    }
    renderResults(currentResults);
  } catch (err) {
    console.error(err);
    setMessage("Search failed. Check your API key or try again later.");
  }
}

function openVideo(videoId) {
  if (!videoId) return;
  videoFrame.src = buildEmbedUrl(videoId);
  openModal(videoModal);
}

videoModal.addEventListener("click", (event) => {
  if (event.target === videoModal) {
    videoFrame.src = "";
  }
});

const closeVideoBtn = videoModal.querySelector("[data-close]");
if (closeVideoBtn) {
  closeVideoBtn.addEventListener("click", () => {
    videoFrame.src = "";
  });
}

function populatePlaylists() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  playlistSelect.innerHTML = "";
  currentUser.playlists.forEach((playlist) => {
    const option = document.createElement("option");
    option.value = playlist.id;
    option.textContent = playlist.name;
    playlistSelect.appendChild(option);
  });
  const newOption = document.createElement("option");
  newOption.value = "__new__";
  newOption.textContent = "Create new playlist";
  playlistSelect.appendChild(newOption);
  playlistSelect.value = currentUser.playlists.length ? currentUser.playlists[0].id : "__new__";
  toggleNewPlaylistField();
}

function toggleNewPlaylistField() {
  const isNew = playlistSelect.value === "__new__";
  newPlaylistField.style.display = isNew ? "grid" : "none";
}

playlistSelect.addEventListener("change", toggleNewPlaylistField);

function openPlaylistModal(video) {
  pendingVideo = video;
  playlistVideoTitle.textContent = video.title;
  playlistMessage.textContent = "";
  newPlaylistName.value = "";
  populatePlaylists();
  openModal(playlistModal);
}

function addVideoToPlaylist(targetPlaylistId, targetPlaylistName) {
  if (!pendingVideo) return;

  const alreadySaved = getSavedPlaylists(pendingVideo.id);
  if (alreadySaved.length) {
    playlistMessage.textContent = "This video is already saved.";
    return;
  }

  updateCurrentUser((currentUser) => {
    const playlists = currentUser.playlists || [];
    let playlist = playlists.find((item) => item.id === targetPlaylistId);

    if (!playlist) {
      playlist = {
        id: targetPlaylistId,
        name: targetPlaylistName,
        createdAt: Date.now(),
        videos: []
      };
      playlists.push(playlist);
    }

    playlist.videos.push({
      id: pendingVideo.id,
      title: pendingVideo.title,
      channelTitle: pendingVideo.channelTitle,
      thumbnail: pendingVideo.thumbnail,
      duration: pendingVideo.duration,
      viewCount: pendingVideo.viewCount,
      likeCount: pendingVideo.likeCount,
      category: pendingVideo.category,
      addedAt: Date.now()
    });

    currentUser.playlists = playlists;
  });

  closeModal(playlistModal);
  renderResults(currentResults);
  showToast("Video saved to playlist.");
}

playlistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  playlistMessage.textContent = "";
  if (!pendingVideo) return;

  if (playlistSelect.value === "__new__") {
    const name = newPlaylistName.value.trim();
    if (!name) {
      playlistMessage.textContent = "Enter a name for the new playlist.";
      return;
    }
    addVideoToPlaylist(`pl-${Date.now()}`, name);
    return;
  }

  const selected = playlistSelect.value;
  const currentUser = getCurrentUser();
  const playlist = currentUser.playlists.find((item) => item.id === selected);
  if (!playlist) {
    playlistMessage.textContent = "Select a playlist.";
    return;
  }
  addVideoToPlaylist(selected, playlist.name);
});

resultsGrid.addEventListener("click", (event) => {
  const playBtn = event.target.closest("[data-play]");
  if (playBtn) {
    openVideo(playBtn.dataset.id);
    return;
  }
  const addBtn = event.target.closest("[data-add]");
  if (addBtn) {
    const video = currentResults.find((item) => item.id === addBtn.dataset.id);
    if (video) {
      openPlaylistModal(video);
    }
  }
});

searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  performSearch(query, true);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    performSearch(searchInput.value.trim(), true);
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  setLastSearch("");
  setQueryParam("q", "", true);
  currentResults = [];
  resultsGrid.innerHTML = "";
  setMessage("Type a search term to begin.");
});

const queryFromUrl = getQueryParam("q") || getLastSearch();
if (queryFromUrl) {
  searchInput.value = queryFromUrl;
  performSearch(queryFromUrl, false);
} else {
  setMessage("Type a search term to begin.");
}
