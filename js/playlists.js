const user = requireAuth();
const userBadge = document.getElementById("userBadge");
const playlistList = document.getElementById("playlistList");
const playlistCount = document.getElementById("playlistCount");
const playlistTitle = document.getElementById("playlistTitle");
const playlistMeta = document.getElementById("playlistMeta");
const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");
const filterInput = document.getElementById("filterInput");
const sortSelect = document.getElementById("sortSelect");
const playlistGrid = document.getElementById("playlistGrid");
const playlistMessage = document.getElementById("playlistMessage");

const videoModal = document.getElementById("videoModal");
const videoFrame = document.getElementById("videoFrame");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const createPlaylistModal = document.getElementById("createPlaylistModal");
const createPlaylistForm = document.getElementById("createPlaylistForm");
const playlistNameInput = document.getElementById("playlistName");
const createPlaylistMessage = document.getElementById("createPlaylistMessage");

let currentUser = user;
let activePlaylistId = null;

if (currentUser) {
  userBadge.textContent = currentUser.firstName || currentUser.username;
}

attachLogout("#logoutBtn");

bindModalDismiss(videoModal);
bindModalDismiss(createPlaylistModal);

function refreshUser() {
  currentUser = getCurrentUser();
  return currentUser;
}

function setPlaylistMessage(message) {
  if (!message) {
    playlistMessage.hidden = true;
    playlistMessage.textContent = "";
    return;
  }
  playlistMessage.textContent = message;
  playlistMessage.hidden = false;
}

function renderSidebar() {
  refreshUser();
  playlistList.innerHTML = "";
  const playlists = currentUser ? currentUser.playlists : [];
  playlistCount.textContent = playlists.length;

  if (!playlists.length) {
    setPlaylistMessage("No playlists yet. Create one to get started.");
    return;
  }

  playlists.forEach((playlist) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playlist-item";
    if (playlist.id === activePlaylistId) {
      button.classList.add("active");
    }
    button.dataset.id = playlist.id;
    button.innerHTML = `
      <span>${escapeHtml(playlist.name)}</span>
      <span class="count-pill">${playlist.videos.length}</span>
    `;
    playlistList.appendChild(button);
  });
}

function getActivePlaylist() {
  if (!currentUser) return null;
  return currentUser.playlists.find((playlist) => playlist.id === activePlaylistId) || null;
}

function renderVideos(videos) {
  playlistGrid.innerHTML = "";
  if (!videos.length) {
    setPlaylistMessage("This playlist is empty. Add videos from the search page.");
    return;
  }
  setPlaylistMessage("");

  videos.forEach((video, index) => {
    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${index * 0.06}s`;

    const titleText = escapeHtml(video.title || "Untitled");
    const titleAttr = video.title && video.title.length > 46 ? `title="${titleText}"` : "";

    card.innerHTML = `
      <button class="link-button card-media" data-play data-id="${video.id}" aria-label="Play ${titleText}">
        <img src="${video.thumbnail || "https://via.placeholder.com/320x180?text=No+Image"}" alt="${titleText}">
      </button>
      <div class="card-body">
        <div class="card-title" ${titleAttr}>
          <button class="link-button" data-play data-id="${video.id}">${titleText}</button>
        </div>
        <div class="meta">
          <span>Channel: ${escapeHtml(video.channelTitle || "")}</span>
          <span>Duration: ${escapeHtml(video.duration || "0:00")}</span>
          <span>Views: ${formatCount(video.viewCount)}</span>
          <span>Likes: ${formatCount(video.likeCount)}</span>
          <span>Genre: ${escapeHtml(video.category || "Unknown")}</span>
          <span>Added: ${formatDate(video.addedAt)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost" data-play data-id="${video.id}" type="button">Play</button>
          <button class="btn btn-danger" data-remove data-id="${video.id}" type="button">Remove</button>
        </div>
      </div>
    `;

    playlistGrid.appendChild(card);
  });
}

function renderActivePlaylist() {
  refreshUser();
  const playlist = getActivePlaylist();
  if (!playlist) {
    playlistTitle.textContent = "Select a playlist";
    playlistMeta.textContent = "";
    deletePlaylistBtn.hidden = true;
    playlistGrid.innerHTML = "";
    if (currentUser && currentUser.playlists.length === 0) {
      setPlaylistMessage("No playlists yet. Create one to get started.");
    }
    return;
  }

  playlistTitle.textContent = playlist.name;
  playlistMeta.textContent = `${playlist.videos.length} videos - Created ${formatDate(
    playlist.createdAt
  )}`;
  deletePlaylistBtn.hidden = false;

  let list = [...playlist.videos];
  const filterTerm = filterInput.value.trim().toLowerCase();
  if (filterTerm) {
    list = list.filter((video) => {
      const title = String(video.title || "").toLowerCase();
      const channel = String(video.channelTitle || "").toLowerCase();
      return title.includes(filterTerm) || channel.includes(filterTerm);
    });
  }

  const sortMode = sortSelect.value;
  if (sortMode === "az") {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sortMode === "likes") {
    list.sort((a, b) => Number(b.likeCount || 0) - Number(a.likeCount || 0));
  } else if (sortMode === "newest") {
    list.sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
  }

  renderVideos(list);
}

function selectPlaylist(id, pushHistory) {
  activePlaylistId = id;
  setQueryParam("playlistId", id, pushHistory);
  renderSidebar();
  renderActivePlaylist();
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

playlistList.addEventListener("click", (event) => {
  const button = event.target.closest(".playlist-item");
  if (!button) return;
  selectPlaylist(button.dataset.id, true);
});

playlistGrid.addEventListener("click", (event) => {
  const playBtn = event.target.closest("[data-play]");
  if (playBtn) {
    openVideo(playBtn.dataset.id);
    return;
  }
  const removeBtn = event.target.closest("[data-remove]");
  if (removeBtn) {
    updateCurrentUser((currentUser) => {
      const playlist = currentUser.playlists.find((item) => item.id === activePlaylistId);
      if (!playlist) return;
      playlist.videos = playlist.videos.filter((video) => video.id !== removeBtn.dataset.id);
    });
    renderSidebar();
    renderActivePlaylist();
    showToast("Video removed.");
  }
});

filterInput.addEventListener("input", () => {
  renderActivePlaylist();
});

sortSelect.addEventListener("change", () => {
  renderActivePlaylist();
});

deletePlaylistBtn.addEventListener("click", () => {
  const playlist = getActivePlaylist();
  if (!playlist) return;
  if (!confirm("Delete this playlist and all its videos?")) return;
  updateCurrentUser((currentUser) => {
    currentUser.playlists = currentUser.playlists.filter((item) => item.id !== playlist.id);
  });
  showToast("Playlist deleted.");
  refreshUser();
  activePlaylistId = currentUser.playlists[0] ? currentUser.playlists[0].id : null;
  if (activePlaylistId) {
    setQueryParam("playlistId", activePlaylistId, true);
  } else {
    setQueryParam("playlistId", "", true);
  }
  renderSidebar();
  renderActivePlaylist();
});

createPlaylistBtn.addEventListener("click", () => {
  createPlaylistMessage.textContent = "";
  playlistNameInput.value = "";
  openModal(createPlaylistModal);
});

createPlaylistForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = playlistNameInput.value.trim();
  if (!name) {
    createPlaylistMessage.textContent = "Enter a playlist name.";
    return;
  }

  const newPlaylistId = `pl-${Date.now()}`;
  updateCurrentUser((currentUser) => {
    currentUser.playlists.push({
      id: newPlaylistId,
      name,
      createdAt: Date.now(),
      videos: []
    });
  });

  closeModal(createPlaylistModal);
  showToast("Playlist created.");
  selectPlaylist(newPlaylistId, true);
});

const initialId = getQueryParam("playlistId") || getQueryParam("id");
refreshUser();
if (currentUser && currentUser.playlists.length) {
  const validId = currentUser.playlists.some((item) => item.id === initialId)
    ? initialId
    : currentUser.playlists[0].id;
  selectPlaylist(validId, false);
} else {
  renderSidebar();
  renderActivePlaylist();
}
