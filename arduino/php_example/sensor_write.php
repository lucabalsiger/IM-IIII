<?php
// Dieses File in euer PHP-Projekt kopieren.
// Aufruf: sensor_write.php via POST vom ESP32 oder direkt aus eurem Code.
//
// Umgebungsdaten:  type=environment, user_id, temperature, humidity, light_level
// Schlafdaten:     type=sleep,       user_id, quality (calm/restless/awake)

require_once 'config.php';

header('Content-Type: application/json');

$type    = $_POST['type']    ?? '';
$user_id = (int)($_POST['user_id'] ?? 0);

if (!$type || !$user_id) {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'type und user_id erforderlich']));
}

if ($type === 'environment') {
    $temp  = (float)($_POST['temperature']  ?? 0);
    $hum   = (float)($_POST['humidity']     ?? 0);
    $light = (int)  ($_POST['light_level']  ?? 0);

    $stmt = $pdo->prepare(
        "INSERT INTO sensor_environment (user_id, temperature, humidity, light_level)
         VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $temp, $hum, $light]);

} elseif ($type === 'sleep') {
    $quality = $_POST['quality'] ?? '';
    $allowed = ['calm', 'restless', 'awake'];

    if (!in_array($quality, $allowed)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'Ungültige quality']));
    }

    $stmt = $pdo->prepare(
        "INSERT INTO sensor_sleep (user_id, quality) VALUES (?, ?)"
    );
    $stmt->execute([$user_id, $quality]);

} else {
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'Unbekannter type']));
}

echo json_encode(['success' => true]);
