const form       = document.getElementById("forgotForm");
const msg        = document.getElementById("msg");
const submitBtn  = document.getElementById("submitBtn");
const emailInput = document.getElementById("email");

function showMsg(text, type) {
  msg.textContent = text;
  msg.className = "message " + type;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";
  emailInput.classList.remove("error");

  const email = emailInput.value.trim();

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

  submitBtn.disabled = true;
  submitBtn.textContent = "Lädt…";

  try {
    const response = await fetch("api/forgot-password.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email }),
    });

    const result = await response.json();
    showMsg(result.message, result.success ? "success" : "error");
    if (!result.success) emailInput.classList.add("error");
  } catch {
    showMsg("Verbindungsfehler. Bitte erneut versuchen.", "error");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Link senden";
});
