const form      = document.getElementById("loginform");
const msg       = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePw  = document.getElementById("togglePw");
const pwInput   = document.getElementById("password");

togglePw.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  togglePw.textContent = show ? "Verstecken" : "Zeigen";
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "message " + type;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";

  const email    = document.getElementById("email").value.trim();
  const password = pwInput.value.trim();

  if (!email || !password) {
    showMsg("Bitte alle Felder ausfüllen.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Lädt…";

  try {
    const response = await fetch("api/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }),
    });

    const result = await response.json();

    if (result.success) {
      showMsg("Login erfolgreich! Du wirst weitergeleitet…", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } else {
      showMsg(result.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Einloggen";
    }
  } catch {
    showMsg("Ein Fehler ist aufgetreten. Bitte erneut versuchen.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Einloggen";
  }
});
