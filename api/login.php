<?php
ini_set('session.cookie_httponly', 1);
session_start();
header("Content-Type: application/json");

require_once "../system/config.php";

$email    = $_POST["email"]    ?? "";
$password = $_POST["password"] ?? "";

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Email und Passwort sind Pflicht."]);
    exit;
}

$stmt = $pdo->prepare("SELECT id, password FROM users WHERE email = :email");
$stmt->execute([":email" => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user["password"])) {
    echo json_encode(["success" => false, "message" => "Ungültige Anmeldedaten."]);
    exit;
}

$_SESSION['user_id'] = $user['id'];
echo json_encode(["success" => true, "message" => "Login erfolgreich!", "userId" => $user["id"]]);
