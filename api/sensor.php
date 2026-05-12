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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type    = trim($_POST['type']    ?? '');
    $user_id = (int)($_POST['user_id'] ?? 0);

    if (!$user_id) send(["success" => false, "message" => "user_id fehlt."]);

    if ($type === 'environment') {
        $temperature = (float)($_POST['temperature'] ?? 0);
        $humidity    = (float)($_POST['humidity']    ?? 0);
        $sound_level = (int)($_POST['sound_level']   ?? 0);

        $pdo->prepare("INSERT INTO environment_data (user_id, temperature, humidity, sound_level) VALUES (:uid, :temp, :hum, :sound)")
            ->execute([':uid' => $user_id, ':temp' => $temperature, ':hum' => $humidity, ':sound' => $sound_level]);

        send(["success" => true]);
    }

    if ($type === 'sleep') {
        $quality = trim($_POST['quality'] ?? '');
        if (!in_array($quality, ['calm', 'restless', 'awake'])) {
            send(["success" => false, "message" => "Ungültiger quality-Wert."]);
        }

        $pdo->prepare("INSERT INTO sleep_data (user_id, quality) VALUES (:uid, :quality)")
            ->execute([':uid' => $user_id, ':quality' => $quality]);

        send(["success" => true]);
    }

    send(["success" => false, "message" => "Ungültiger Typ."]);
}

// GET — requires session
if (!isset($_SESSION['user_id'])) {
    send(["success" => false, "message" => "Nicht eingeloggt."]);
}

$user_id = $_SESSION['user_id'];
$type    = $_GET['type'] ?? 'environment';

if ($type === 'environment') {
    $limit = min((int)($_GET['limit'] ?? 20), 100);
    $stmt  = $pdo->prepare("SELECT temperature, humidity, sound_level, created_at FROM environment_data WHERE user_id = :uid ORDER BY created_at DESC LIMIT :lim");
    $stmt->bindValue(':uid', $user_id, PDO::PARAM_INT);
    $stmt->bindValue(':lim', $limit,   PDO::PARAM_INT);
    $stmt->execute();
    send(["success" => true, "data" => array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC))]);
}

if ($type === 'sleep') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $from = date('Y-m-d', strtotime($date . ' -1 day')) . ' 20:00:00';
    $to   = $date . ' 12:00:00';

    $stmt = $pdo->prepare("SELECT quality, created_at FROM sleep_data WHERE user_id = :uid AND created_at BETWEEN :from AND :to ORDER BY created_at ASC");
    $stmt->execute([':uid' => $user_id, ':from' => $from, ':to' => $to]);
    send(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC), "date" => $date]);
}

send(["success" => false, "message" => "Ungültiger Typ."]);
