<?php
ob_start();
ini_set('session.cookie_httponly', 1);
session_start();
header("Content-Type: application/json");

function send($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

require_once "../system/config.php";

$email    = trim($_POST["email"]    ?? "");
$password = trim($_POST["password"] ?? "");

if (empty($email) || empty($password)) {
    send(["success" => false, "message" => "Bitte alle Felder ausfüllen."]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send(["success" => false, "message" => "Ungültige E-Mail-Adresse."]);
}

$stmt = $pdo->prepare("SELECT id, password FROM users WHERE email = :email");
$stmt->execute([":email" => $email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    send(["success" => false, "message" => "Diese E-Mail-Adresse ist nicht registriert."]);
}

if (!password_verify($password, $user["password"])) {
    send(["success" => false, "message" => "Falsches Passwort."]);
}

$_SESSION['user_id'] = $user['id'];
send(["success" => true, "message" => "Login erfolgreich!", "userId" => $user["id"]]);
