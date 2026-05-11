<?php
ini_set('session.cookie_httponly', 1);
session_start();

if (isset($_SESSION['user_id'])) {
    header("Location: index.html");
    exit;
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login</title>
</head>
<body>

  <h1>Login</h1>

  <form id="loginform">
    <div>
      <label for="email">Email</label>
      <input type="email" id="email" required />
    </div>

    <div>
      <label for="password">Password</label>
      <input type="password" id="password" required />
    </div>

    <button type="submit">Login</button>
  </form>

  <script src="js/login.js"></script>
</body>
</html>
