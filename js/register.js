const form        = document.getElementById("registerForm");
const msg         = document.getElementById("msg");
const submitBtn   = document.getElementById("submitBtn");
const togglePw    = document.getElementById("togglePw");
const togglePw2   = document.getElementById("togglePw2");
const pwInput     = document.getElementById("password");
const pw2Input    = document.getElementById("password2");
const emailInput  = document.getElementById("email");

togglePw.addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  togglePw.textContent = show ? "Verstecken" : "Zeigen";
});

togglePw2.addEventListener("click", () => {
  const show = pw2Input.type === "password";
  pw2Input.type = show ? "text" : "password";
  togglePw2.textContent = show ? "Verstecken" : "Zeigen";
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "message " + type;
}

function resetBtn() {
  submitBtn.disabled = false;
  submitBtn.textContent = "Konto erstellen";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";
  [emailInput, pwInput, pw2Input].forEach(el => el.classList.remove("error"));

  const email     = emailInput.value.trim();
  const password  = pwInput.value.trim();
  const password2 = pw2Input.value.trim();

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

  if (password.length < 6) {
    showMsg("Das Passwort muss mindestens 6 Zeichen lang sein.", "error");
    pwInput.classList.add("error");
    pwInput.focus();
    return;
  }

  if (password !== password2) {
    showMsg("Die Passwörter stimmen nicht überein.", "error");
    pw2Input.classList.add("error");
    pw2Input.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Lädt…";

  try {
    const response = await fetch("api/register.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }),
    });

    const result = await response.json();

    if (result.success) {
      showMsg("Konto erfolgreich erstellt! Du wirst zum Login weitergeleitet…", "success");
      setTimeout(() => { window.location.href = "login.html"; }, 1500);
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
