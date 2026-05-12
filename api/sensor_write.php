<?php
ob_start();
require_once '../system/config.php';

header('Content-Type: application/json');

function send($data) { ob_clean(); echo json_encode($data); exit; }

$type    = $_POST['type']    ?? '';
$user_id = (int)($_POST['user_id'] ?? 0);

if (!$type || !$user_id) {
    http_response_code(400);
    send(['success' => false, 'message' => 'type und user_id erforderlich']);
}

if ($type === 'environment') {
    $temp  = (float)($_POST['temperature']  ?? 0);
    $hum   = (float)($_POST['humidity']     ?? 0);
    $light = (int)  ($_POST['sound_level']  ?? 0);

    $stmt = $pdo->prepare(
        "INSERT INTO sensor_environment (user_id, temperature, humidity, sound_level)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $temp, $hum, $light]);

} elseif ($type === 'sleep') {
    $quality = $_POST['quality'] ?? '';
    if (!in_array($quality, ['calm', 'restless', 'awake'])) {
        http_response_code(400);
        send(['success' => false, 'message' => 'Ungültige quality']);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO sensor_sleep (user_id, quality) VALUES (?, ?)"
    );
    $stmt->execute([$user_id, $quality]);

} else {
    http_response_code(400);
    send(['success' => false, 'message' => 'Unbekannter type']);
}

send(['success' => true]);
