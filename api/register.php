<?php
ob_start();
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

if (strlen($password) < 6) {
    send(["success" => false, "message" => "Das Passwort muss mindestens 6 Zeichen lang sein."]);
}

$check = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$check->execute([":email" => $email]);
if ($check->fetch()) {
    send(["success" => false, "message" => "Diese E-Mail-Adresse ist bereits registriert."]);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (:email, :password)");
$stmt->execute([":email" => $email, ":password" => $hash]);

send(["success" => true, "message" => "Konto erfolgreich erstellt!"]);
