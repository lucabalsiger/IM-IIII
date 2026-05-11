console.log("Login.js verbunden!");

document.getElementById("loginform")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const response = await fetch("api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password }),
      });

      const result = await response.json();
      if (result.success) {
        window.location.href = "index.html";
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Ein Fehler ist aufgetreten. Bitte erneut versuchen.");
    }
  });
