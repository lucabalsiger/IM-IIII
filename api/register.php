<?php
ob_start();
header("Content-Type: application/json");

require_once "../system/config.php";

$email    = trim($_POST["email"]    ?? "");
$password = trim($_POST["password"] ?? "");

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Bitte alle Felder ausfüllen."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Ungültige E-Mail-Adresse."]);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(["success" => false, "message" => "Das Passwort muss mindestens 6 Zeichen lang sein."]);
    exit;
}

$check = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$check->execute([":email" => $email]);
if ($check->fetch()) {
    echo json_encode(["success" => false, "message" => "Diese E-Mail-Adresse ist bereits registriert."]);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (:email, :password)");
$stmt->execute([":email" => $email, ":password" => $hash]);

echo json_encode(["success" => true, "message" => "Konto erfolgreich erstellt!"]);
