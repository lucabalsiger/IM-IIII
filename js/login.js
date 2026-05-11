const form      = document.getElementById("loginform");
const msg       = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePw  = document.getElementById("togglePw");
const pwInput   = document.getElementById("password");
const emailInput = document.getElementById("email");

togglePw.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  togglePw.textContent = show ? "Verstecken" : "Zeigen";
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "message " + type;
}

function resetBtn() {
  submitBtn.disabled = false;
  submitBtn.textContent = "Einloggen";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";
  emailInput.classList.remove("error");
  pwInput.classList.remove("error");

  const email    = emailInput.value.trim();
  const password = pwInput.value.trim();

  if (!email) {
    showMsg("Bitte E-Mail-Adresse eingeben.", "error");
    emailInput.classList.add("error");
    emailInput.focus();
    return;
  }

  if (!email.includes("@")) {
    showMsg("Ungültige E-Mail-Adresse.", "error");
    emailInput.classList.add("error");
    emailInput.focus();
    return;
  }

  if (!password) {
    showMsg("Bitte Passwort eingeben.", "error");
    pwInput.classList.add("error");
    pwInput.focus();
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
      if (result.message.includes("E-Mail") || result.message.includes("registriert")) {
        emailInput.classList.add("error");
      } else if (result.message.includes("Passwort")) {
        pwInput.classList.add("error");
      }
      resetBtn();
    }
  } catch {
    showMsg("Verbindungsfehler. Bitte erneut versuchen.", "error");
    resetBtn();
  }
});
