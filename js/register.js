console.log("Register.js verbunden!");
 
document.getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    // verhindert, dass das Formular die Seite neu lädt
    e.preventDefault();
    console.log("Submit!!");
 
    const email = document.getElementById("email").value.trim();
 
    const password = document.getElementById("password").value.trim();
 
    console.log(email + " " + password);
 
    try {
      const response = await fetch("api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password }),
      });
 
      const result = await response.json();
      console.log(result);
    } catch (error) {}
  });