<?php
ob_start();
header("Content-Type: application/json");

function send($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

require_once "../system/config.php";

$token    = trim($_POST["token"]    ?? "");
$password = trim($_POST["password"] ?? "");

if (empty($token) || empty($password)) {
    send(["success" => false, "message" => "Ungültige Anfrage."]);
}

if (strlen($password) < 6) {
    send(["success" => false, "message" => "Das Passwort muss mindestens 6 Zeichen lang sein."]);
}

$stmt = $pdo->prepare("SELECT email FROM password_resets WHERE token = :token AND expires_at > NOW()");
$stmt->execute([":token" => $token]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    send(["success" => false, "message" => "Der Link ist ungültig oder abgelaufen."]);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo->prepare("UPDATE users SET password = :password WHERE email = :email")
    ->execute([":password" => $hash, ":email" => $row["email"]]);

$pdo->prepare("DELETE FROM password_resets WHERE token = :token")
    ->execute([":token" => $token]);

send(["success" => true, "message" => "Passwort erfolgreich geändert!"]);
