<?php
/**
 * KPU Monasmuda Institute - Deployment Script
 * 
 * This script helps deploy the voting system by setting up the database
 * and checking system requirements.
 */

// ========================================
// DEPLOYMENT CONFIGURATION
// ========================================

$config = [
    'db_host' => 'localhost',
    'db_name' => 'kpu_monasmuda',
    'db_user' => 'root',
    'db_pass' => '',
    'setup_file' => 'database/setup.sql'
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function printHeader($title) {
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "  " . strtoupper($title) . "\n";
    echo str_repeat("=", 50) . "\n";
}

function printStep($step, $description) {
    echo sprintf("[%d] %s\n", $step, $description);
}

function printSuccess($message) {
    echo "✅ " . $message . "\n";
}

function printError($message) {
    echo "❌ " . $message . "\n";
}

function printWarning($message) {
    echo "⚠️  " . $message . "\n";
}

// ========================================
// SYSTEM REQUIREMENTS CHECK
// ========================================

function checkSystemRequirements() {
    printHeader("System Requirements Check");
    
    $requirements = [
        'PHP Version >= 7.4' => version_compare(PHP_VERSION, '7.4.0', '>='),
        'PDO Extension' => extension_loaded('pdo'),
        'PDO MySQL Extension' => extension_loaded('pdo_mysql'),
        'JSON Extension' => extension_loaded('json'),
        'Session Support' => function_exists('session_start')
    ];
    
    $allPassed = true;
    
    foreach ($requirements as $requirement => $passed) {
        if ($passed) {
            printSuccess($requirement);
        } else {
            printError($requirement);
            $allPassed = false;
        }
    }
    
    if (!$allPassed) {
        printError("Some system requirements are not met. Please fix them before continuing.");
        return false;
    }
    
    printSuccess("All system requirements are met!");
    return true;
}

// ========================================
// DATABASE SETUP
// ========================================

function setupDatabase($config) {
    printHeader("Database Setup");
    
    try {
        // Connect to MySQL server (without database)
        printStep(1, "Connecting to MySQL server...");
        $dsn = "mysql:host={$config['db_host']};charset=utf8mb4";
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        printSuccess("Connected to MySQL server");
        
        // Create database if not exists
        printStep(2, "Creating database '{$config['db_name']}'...");
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['db_name']}`");
        printSuccess("Database created or already exists");
        
        // Use the database
        $pdo->exec("USE `{$config['db_name']}`");
        
        // Read and execute setup SQL file
        printStep(3, "Executing setup SQL file...");
        if (!file_exists($config['setup_file'])) {
            throw new Exception("Setup file not found: {$config['setup_file']}");
        }
        
        $sql = file_get_contents($config['setup_file']);
        
        // Split SQL into individual statements
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            function($stmt) {
                return !empty($stmt) && !preg_match('/^--/', $stmt);
            }
        );
        
        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                $pdo->exec($statement);
            }
        }
        
        printSuccess("Database setup completed successfully");
        
        // Verify setup
        printStep(4, "Verifying database setup...");
        $tables = ['users', 'candidates', 'votes', 'activity_log', 'admin_users', 'election_settings'];
        
        foreach ($tables as $table) {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() === 0) {
                throw new Exception("Table '$table' was not created");
            }
        }
        
        printSuccess("All required tables are present");
        
        // Show sample data counts
        printStep(5, "Checking sample data...");
        $counts = [
            'Users' => $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
            'Candidates' => $pdo->query("SELECT COUNT(*) FROM candidates")->fetchColumn(),
            'Admin Users' => $pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn(),
            'Election Settings' => $pdo->query("SELECT COUNT(*) FROM election_settings")->fetchColumn()
        ];
        
        foreach ($counts as $type => $count) {
            printSuccess("$type: $count records");
        }
        
        return true;
        
    } catch (Exception $e) {
        printError("Database setup failed: " . $e->getMessage());
        return false;
    }
}

// ========================================
// FILE PERMISSIONS CHECK
// ========================================

function checkFilePermissions() {
    printHeader("File Permissions Check");
    
    $directories = [
        'kandidat' => 'Candidate photos directory',
        'database' => 'Database files directory',
        'api' => 'API files directory'
    ];
    
    foreach ($directories as $dir => $description) {
        if (is_dir($dir)) {
            if (is_writable($dir)) {
                printSuccess("$description is writable");
            } else {
                printWarning("$description is not writable - some features may not work");
            }
        } else {
            printWarning("$description does not exist");
        }
    }
    
    return true;
}

// ========================================
// CONFIGURATION FILE GENERATION
// ========================================

function generateConfigFile($config) {
    printHeader("Configuration File Check");
    
    $configFile = 'database/config.php';
    
    if (file_exists($configFile)) {
        printSuccess("Configuration file already exists");
        return true;
    }
    
    printWarning("Configuration file not found - please ensure database/config.php exists");
    return false;
}

// ========================================
// DEPLOYMENT SUMMARY
// ========================================

function showDeploymentSummary($config) {
    printHeader("Deployment Summary");
    
    echo "🎉 KPU Monasmuda Institute Voting System has been deployed successfully!\n\n";
    
    echo "📋 System Information:\n";
    echo "   • Database: {$config['db_name']}\n";
    echo "   • Host: {$config['db_host']}\n";
    echo "   • PHP Version: " . PHP_VERSION . "\n\n";
    
    echo "🔐 Default Admin Login:\n";
    echo "   • Username: admin\n";
    echo "   • Password: admin123\n";
    echo "   • URL: /admin-login.html\n\n";
    
    echo "🌐 Application URLs:\n";
    echo "   • Main Site: /index.html\n";
    echo "   • Voter Login: /login.html\n";
    echo "   • Admin Panel: /admin.html\n";
    echo "   • Results: /pengumuman.html\n";
    echo "   • API Endpoint: /api/index.php\n\n";
    
    echo "📝 Sample Users (for testing):\n";
    echo "   • Username: ahmad001, Password: password123\n";
    echo "   • Username: siti002, Password: password123\n";
    echo "   • Username: budi003, Password: password123\n\n";
    
    echo "⚠️  Important Notes:\n";
    echo "   • Change default admin password in production\n";
    echo "   • Update database credentials in database/config.php for production\n";
    echo "   • Ensure proper file permissions for security\n";
    echo "   • Enable HTTPS in production environment\n\n";
    
    echo "🚀 Your voting system is ready to use!\n";
}

// ========================================
// MAIN DEPLOYMENT PROCESS
// ========================================

function main() {
    global $config;
    
    echo "🗳️  KPU Monasmuda Institute - Voting System Deployment\n";
    echo "Developed by Muhammad Eden Luqmanul Hakim for KPU Monasmuda Institute © 2025\n";
    
    // Step 1: Check system requirements
    if (!checkSystemRequirements()) {
        exit(1);
    }
    
    // Step 2: Check file permissions
    checkFilePermissions();
    
    // Step 3: Check configuration file
    if (!generateConfigFile($config)) {
        printError("Please create the configuration file first");
        exit(1);
    }
    
    // Step 4: Setup database
    if (!setupDatabase($config)) {
        printError("Database setup failed");
        exit(1);
    }
    
    // Step 5: Show deployment summary
    showDeploymentSummary($config);
    
    return true;
}

// ========================================
// RUN DEPLOYMENT
// ========================================

// Check if running from command line or web
if (php_sapi_name() === 'cli') {
    // Command line execution
    main();
} else {
    // Web execution
    header('Content-Type: text/plain');
    echo "KPU Monasmuda Institute - Deployment Script\n";
    echo "==========================================\n\n";
    
    if (isset($_GET['deploy']) && $_GET['deploy'] === 'true') {
        main();
    } else {
        echo "To run deployment, visit: " . $_SERVER['REQUEST_URI'] . "?deploy=true\n";
        echo "Or run from command line: php deploy.php\n";
    }
}

?>
