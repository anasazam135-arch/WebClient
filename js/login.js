const form = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const usernameInput = document.getElementById("loginUsername");
const passwordInput = document.getElementById("loginPassword");

function setMessage(text) {
  loginMessage.textContent = text || "";
}

const presetUsername = getQueryParam("username");
if (presetUsername) {
  usernameInput.value = presetUsername;
}

if (getQueryParam("registered")) {
  showToast("Registration complete. Please log in.");
}

const existingUser = getCurrentUser();
if (existingUser) {
  window.location.href = "search.html";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setMessage("");

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    setMessage("Enter both username and password.");
    return;
  }

  const user = findUser(username);
  if (!user || user.password !== password) {
    setMessage("Incorrect username or password.");
    return;
  }

  setCurrentUser(user.username);
  window.location.href = "search.html";
});
