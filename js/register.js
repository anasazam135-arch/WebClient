const form = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");

function setMessage(text) {
  formMessage.textContent = text || "";
}

function isStrongPassword(password) {
  return password.length >= 6 && /[A-Z]/.test(password) && /\d/.test(password);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setMessage("");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const email = document.getElementById("email").value.trim();
  const firstName = document.getElementById("firstName").value.trim();
  const imageUrl = document.getElementById("imageUrl").value.trim();

  if (!username || !password || !confirmPassword || !email || !firstName || !imageUrl) {
    setMessage("Please fill in all required fields.");
    return;
  }

  if (usernameExists(username)) {
    setMessage("This username is already taken.");
    return;
  }

  if (!isStrongPassword(password)) {
    setMessage("Password must be at least 6 characters with one uppercase letter and one number.");
    return;
  }

  if (password !== confirmPassword) {
    setMessage("Passwords do not match.");
    return;
  }

  const newUser = {
    id: Date.now(),
    username,
    password,
    email,
    firstName,
    imageUrl,
    createdAt: Date.now(),
    playlists: []
  };

  addUser(newUser);

  window.location.href = `login.html?registered=1&username=${encodeURIComponent(username)}`;
});
