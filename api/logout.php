<?php
ini_set('session.cookie_httponly', 1);
session_start();
session_destroy();
header("Location: ../login.html");
exit;
