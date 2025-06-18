<?php
// XAMPP MySQL Configuration
$configs = [
    ['host' => 'localhost', 'user' => 'root', 'pass' => ''],  // XAMPP default
    ['host' => '127.0.0.1', 'user' => 'root', 'pass' => ''], // Alternative
    ['host' => 'localhost', 'user' => 'root', 'pass' => 'root'], // If password set
];

$pdo = null;
foreach ($configs as $config) {
    try {
        $pdo = new PDO(
            "mysql:host={$config['host']};dbname=kpu_monasmuda;charset=utf8",
            $config['user'],
            $config['pass']
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        break; // Success, stop trying
    } catch(PDOException $e) {
        continue; // Try next config
    }
}

if (!$pdo) {
    die(json_encode(['error' => 'Database connection failed. Please run setup-database.php first.']));
}

// CORS headers for frontend access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}
?>
