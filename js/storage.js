const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";
const LAST_SEARCH_KEY = "lastSearch";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Storage read error:", err);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function getUsers() {
  const users = readJson(USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  writeJson(USERS_KEY, users);
}

function findUser(username) {
  const key = normalizeUsername(username);
  return getUsers().find((user) => normalizeUsername(user.username) === key) || null;
}

function usernameExists(username) {
  return Boolean(findUser(username));
}

function addUser(user) {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return user;
}

function updateUser(updatedUser) {
  const users = getUsers();
  const idx = users.findIndex(
    (user) => normalizeUsername(user.username) === normalizeUsername(updatedUser.username)
  );
  if (idx === -1) return false;
  users[idx] = updatedUser;
  saveUsers(users);
  return true;
}

function setCurrentUser(username) {
  sessionStorage.setItem(CURRENT_USER_KEY, username);
}

function getCurrentUsername() {
  return sessionStorage.getItem(CURRENT_USER_KEY);
}

function clearCurrentUser() {
  sessionStorage.removeItem(CURRENT_USER_KEY);
}

function ensurePlaylists(user) {
  if (!user.playlists || !Array.isArray(user.playlists)) {
    user.playlists = [];
  }
  return user;
}

function getCurrentUser() {
  const username = getCurrentUsername();
  if (!username) return null;
  const user = findUser(username);
  if (!user) return null;
  return ensurePlaylists(user);
}

function cloneUser(user) {
  return JSON.parse(JSON.stringify(user));
}

function updateCurrentUser(mutator) {
  const user = getCurrentUser();
  if (!user) return null;
  const updated = cloneUser(user);
  mutator(updated);
  updateUser(updated);
  return updated;
}

function getLastSearch() {
  return sessionStorage.getItem(LAST_SEARCH_KEY);
}

function setLastSearch(query) {
  if (!query) {
    sessionStorage.removeItem(LAST_SEARCH_KEY);
    return;
  }
  sessionStorage.setItem(LAST_SEARCH_KEY, query);
}
