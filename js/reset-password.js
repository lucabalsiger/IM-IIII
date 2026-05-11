const form      = document.getElementById("resetForm");
const msg       = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const pwInput   = document.getElementById("password");
const pw2Input  = document.getElementById("password2");

const token = new URLSearchParams(window.location.search).get("token");

if (!token) {
  document.getElementById("msg").textContent = "Ungültiger oder abgelaufener Link.";
  document.getElementById("msg").className = "message error";
  document.getElementById("resetForm").style.display = "none";
}

document.getElementById("togglePw").addEventListener("click", () => {
  const show = pwInput.type === "password";
  pwInput.type = show ? "text" : "password";
  document.getElementById("togglePw").textContent = show ? "Verstecken" : "Zeigen";
});

document.getElementById("togglePw2").addEventListener("click", () => {
  const show = pw2Input.type === "password";
  pw2Input.type = show ? "text" : "password";
  document.getElementById("togglePw2").textContent = show ? "Verstecken" : "Zeigen";
});

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "message " + type;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";
  [pwInput, pw2Input].forEach(el => el.classList.remove("error"));

  const password  = pwInput.value.trim();
  const password2 = pw2Input.value.trim();

  if (!password) {
    showMsg("Bitte neues Passwort eingeben.", "error");
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
    const response = await fetch("api/reset-password.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, password }),
    });

    const result = await response.json();

    if (result.success) {
      showMsg("Passwort erfolgreich geändert! Du wirst zum Login weitergeleitet…", "success");
      form.style.display = "none";
      setTimeout(() => { window.location.href = "login.html"; }, 2000);
    } else {
      showMsg(result.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Passwort speichern";
    }
  } catch {
    showMsg("Verbindungsfehler. Bitte erneut versuchen.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Passwort speichern";
  }
});
