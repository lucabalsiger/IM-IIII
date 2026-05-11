<?php
ob_start();
header("Content-Type: application/json");

function send($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

function sendMail($to, $subject, $body) {
    $ch = curl_init("https://api.resend.com/emails");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer " . $resend_api_key,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "from"    => "noreply@im4.lucabalsiger.ch",
            "to"      => [$to],
            "subject" => $subject,
            "text"    => $body,
        ]),
    ]);
    $result = curl_exec($ch);
    curl_close($ch);
    return $result;
}

require_once "../system/config.php";

$email = trim($_POST["email"] ?? "");

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send(["success" => false, "message" => "Ungültige E-Mail-Adresse."]);
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$stmt->execute([":email" => $email]);

if (!$stmt->fetch()) {
    send(["success" => true, "message" => "Falls diese E-Mail registriert ist, wurde ein Link gesendet."]);
}

$token     = bin2hex(random_bytes(32));
$expiresAt = date("Y-m-d H:i:s", strtotime("+1 hour"));

$pdo->prepare("DELETE FROM password_resets WHERE email = :email")
    ->execute([":email" => $email]);

$pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (:email, :token, :expires_at)")
    ->execute([":email" => $email, ":token" => $token, ":expires_at" => $expiresAt]);

$resetLink = "https://im4.lucabalsiger.ch/reset-password.html?token=" . $token;
$body      = "Hallo,\n\nKlicke auf den folgenden Link um dein Passwort zurückzusetzen:\n\n$resetLink\n\nDer Link ist 1 Stunde gültig.\n\nFalls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.";

sendMail($email, "Passwort zurücksetzen", $body);

send(["success" => true, "message" => "Falls diese E-Mail registriert ist, wurde ein Link gesendet."]);
