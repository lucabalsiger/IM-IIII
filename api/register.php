<?php
header("Content-Type: application/json");

require_once "../system/config.php";

$email    = $_POST["email"]    ?? "";
$password = $_POST["password"] ?? "";

if (empty($email) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Email und Passwort sind Pflicht."]);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (:email, :password)");
$stmt->execute([":email" => $email, ":password" => $hash]);

echo json_encode(["success" => true, "message" => "Registrierung erfolgreich!"]);