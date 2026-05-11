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

if (!isset($_SESSION['user_id'])) {
    send(["success" => false, "message" => "Nicht eingeloggt."]);
}

require_once "../system/config.php";

$stmt = $pdo->prepare("SELECT id, email FROM users WHERE id = :id");
$stmt->execute([":id" => $_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    session_destroy();
    send(["success" => false, "message" => "User nicht gefunden."]);
}

send(["success" => true, "user" => $user]);
