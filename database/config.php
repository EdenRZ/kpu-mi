<?php
/**
 * Database Configuration for KPU Monasmuda Institute
 * 
 * This file contains database connection settings and configuration
 * for the voting system.
 */

// ========================================
// DATABASE CONFIGURATION
// ========================================

// Database connection settings
define('DB_HOST', 'localhost');
define('DB_NAME', 'kpu_monasmuda');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Alternative database settings for production
// Uncomment and modify these for production deployment
/*
define('DB_HOST', 'your-production-host');
define('DB_NAME', 'your-production-database');
define('DB_USER', 'your-production-username');
define('DB_PASS', 'your-production-password');
*/

// ========================================
// PDO CONNECTION
// ========================================

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Set timezone
    $pdo->exec("SET time_zone = '+07:00'");
    
} catch (PDOException $e) {
    // Log error and show user-friendly message
    error_log("Database connection failed: " . $e->getMessage());
    
    // In production, don't show detailed error messages
    if (defined('ENVIRONMENT') && ENVIRONMENT === 'production') {
        die(json_encode([
            'error' => 'Database connection failed. Please try again later.',
            'code' => 'DB_CONNECTION_ERROR'
        ]));
    } else {
        die(json_encode([
            'error' => 'Database connection failed: ' . $e->getMessage(),
            'code' => 'DB_CONNECTION_ERROR',
            'details' => [
                'host' => DB_HOST,
                'database' => DB_NAME,
                'user' => DB_USER
            ]
        ]));
    }
}

// ========================================
// API RESPONSE HELPER CLASS
// ========================================

class ApiResponse {
    public static function success($data = null, $message = 'Success', $code = 200) {
        http_response_code($code);
        return json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    public static function error($message = 'Error', $code = 400, $details = null) {
        http_response_code($code);
        return json_encode([
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'details' => $details,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if database connection is working
 */
function checkDatabaseConnection() {
    global $pdo;
    try {
        $pdo->query('SELECT 1');
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Get database status information
 */
function getDatabaseStatus() {
    global $pdo;
    try {
        $stmt = $pdo->query("SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM candidates) as total_candidates,
            (SELECT COUNT(*) FROM votes) as total_votes,
            (SELECT COUNT(*) FROM activity_log) as total_activities
        ");
        return $stmt->fetch();
    } catch (PDOException $e) {
        return null;
    }
}

/**
 * Log activity to database
 */
function logActivity($userType, $userId, $action, $details = null, $ipAddress = null) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            INSERT INTO activity_log (user_type, user_id, action, details, ip_address) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userType,
            $userId,
            $action,
            $details,
            $ipAddress ?: $_SERVER['REMOTE_ADDR'] ?? null
        ]);
        return true;
    } catch (PDOException $e) {
        error_log("Failed to log activity: " . $e->getMessage());
        return false;
    }
}

// ========================================
// CORS HEADERS FOR API
// ========================================

// Allow cross-origin requests (adjust for production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========================================
// ENVIRONMENT SETTINGS
// ========================================

// Set environment (development/production)
define('ENVIRONMENT', 'development');

// Enable error reporting in development
if (ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// ========================================
// SECURITY SETTINGS
// ========================================

// Session settings
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 for HTTPS

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

?>
