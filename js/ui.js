function showToast(message) {
  if (!message) return;
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="dot"></span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.remove();
    if (!stack.children.length) {
      stack.remove();
    }
  }, 3200);
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("show");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("show");
}

function bindModalDismiss(modal) {
  if (!modal) return;
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
  modal.querySelectorAll("[data-close]").forEach((closeBtn) => {
    closeBtn.addEventListener("click", () => closeModal(modal));
  });
}

function attachLogout(selector) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener("click", () => {
    clearCurrentUser();
    window.location.href = "login.html";
  });
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}
