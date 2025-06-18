<?php
/**
 * KPU Monasmuda Institute - System Test Script
 * 
 * This script tests all system components to ensure everything is working
 */

// ========================================
// TEST CONFIGURATION
// ========================================

$tests = [
    'php_version' => 'PHP Version Check',
    'extensions' => 'PHP Extensions Check',
    'database' => 'Database Connection Test',
    'tables' => 'Database Tables Test',
    'api' => 'API Endpoints Test',
    'files' => 'File Permissions Test',
    'security' => 'Security Configuration Test'
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function printTestHeader($title) {
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "  " . strtoupper($title) . "\n";
    echo str_repeat("=", 60) . "\n";
}

function printTestResult($test, $passed, $message = '') {
    $status = $passed ? "✅ PASS" : "❌ FAIL";
    echo sprintf("%-40s %s\n", $test, $status);
    if (!empty($message)) {
        echo "   → $message\n";
    }
}

function runTest($testName, $testFunction) {
    try {
        $result = $testFunction();
        return $result;
    } catch (Exception $e) {
        printTestResult($testName, false, $e->getMessage());
        return false;
    }
}

// ========================================
// TEST FUNCTIONS
// ========================================

function testPhpVersion() {
    $required = '7.4.0';
    $current = PHP_VERSION;
    $passed = version_compare($current, $required, '>=');
    
    printTestResult("PHP Version ($current)", $passed, 
        $passed ? "Meets requirement (>= $required)" : "Requires PHP >= $required");
    
    return $passed;
}

function testExtensions() {
    $required = ['pdo', 'pdo_mysql', 'json', 'session'];
    $allPassed = true;
    
    foreach ($required as $ext) {
        $loaded = extension_loaded($ext);
        printTestResult("Extension: $ext", $loaded);
        if (!$loaded) $allPassed = false;
    }
    
    return $allPassed;
}

function testDatabase() {
    try {
        require_once 'database/config.php';
        
        // Test connection
        $pdo->query('SELECT 1');
        printTestResult("Database Connection", true, "Connected to " . DB_NAME);
        
        // Test basic query
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '" . DB_NAME . "'");
        $result = $stmt->fetch();
        printTestResult("Database Query", true, "Found {$result['count']} tables");
        
        return true;
        
    } catch (Exception $e) {
        printTestResult("Database Connection", false, $e->getMessage());
        return false;
    }
}

function testTables() {
    try {
        require_once 'database/config.php';
        
        $requiredTables = ['users', 'candidates', 'votes', 'activity_log', 'admin_users', 'election_settings'];
        $allPassed = true;
        
        foreach ($requiredTables as $table) {
            $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
            $exists = $stmt->rowCount() > 0;
            
            if ($exists) {
                // Count records
                $countStmt = $pdo->query("SELECT COUNT(*) as count FROM $table");
                $count = $countStmt->fetch()['count'];
                printTestResult("Table: $table", true, "$count records");
            } else {
                printTestResult("Table: $table", false, "Table not found");
                $allPassed = false;
            }
        }
        
        return $allPassed;
        
    } catch (Exception $e) {
        printTestResult("Tables Check", false, $e->getMessage());
        return false;
    }
}

function testApi() {
    $endpoints = [
        'health_check' => 'System health check',
        'get_users' => 'Get users list',
        'get_candidates' => 'Get candidates list',
        'get_statistics' => 'Get system statistics'
    ];
    
    $allPassed = true;
    
    foreach ($endpoints as $endpoint => $description) {
        $url = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . "/api/index.php?action=$endpoint";
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'ignore_errors' => true
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        
        if ($response !== false) {
            $data = json_decode($response, true);
            $passed = isset($data['success']) && $data['success'];
            printTestResult("API: $endpoint", $passed, $passed ? "OK" : "API returned error");
            if (!$passed) $allPassed = false;
        } else {
            printTestResult("API: $endpoint", false, "Failed to connect");
            $allPassed = false;
        }
    }
    
    return $allPassed;
}

function testFiles() {
    $directories = [
        'kandidat' => 'Candidate photos',
        'database' => 'Database files',
        'api' => 'API files'
    ];
    
    $allPassed = true;
    
    foreach ($directories as $dir => $description) {
        if (is_dir($dir)) {
            $writable = is_writable($dir);
            printTestResult("Directory: $dir", $writable, $writable ? "Writable" : "Not writable");
            if (!$writable) $allPassed = false;
        } else {
            printTestResult("Directory: $dir", false, "Directory not found");
            $allPassed = false;
        }
    }
    
    // Test important files
    $files = [
        'index.html' => 'Main page',
        'database/config.php' => 'Database config',
        'api/index.php' => 'API endpoint'
    ];
    
    foreach ($files as $file => $description) {
        $exists = file_exists($file);
        printTestResult("File: $file", $exists, $exists ? "Found" : "Missing");
        if (!$exists) $allPassed = false;
    }
    
    return $allPassed;
}

function testSecurity() {
    $checks = [
        'HTTPS' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'Session Started' => session_status() === PHP_SESSION_ACTIVE,
        'Error Display Off' => ini_get('display_errors') == 0,
        'File Uploads Enabled' => ini_get('file_uploads') == 1
    ];
    
    $allPassed = true;
    
    foreach ($checks as $check => $passed) {
        printTestResult("Security: $check", $passed);
        // Don't fail on HTTPS in development
        if (!$passed && $check !== 'HTTPS') $allPassed = false;
    }
    
    return $allPassed;
}

// ========================================
// MAIN TEST EXECUTION
// ========================================

function runAllTests() {
    global $tests;
    
    printTestHeader("KPU Monasmuda Institute - System Test");
    echo "Developed by Muhammad Eden Luqmanul Hakim for KPU Monasmuda Institute © 2025\n";
    
    $results = [];
    $totalTests = 0;
    $passedTests = 0;
    
    foreach ($tests as $testKey => $testName) {
        printTestHeader($testName);
        
        $functionName = 'test' . ucfirst($testKey);
        if (function_exists($functionName)) {
            $passed = runTest($testName, $functionName);
            $results[$testKey] = $passed;
            $totalTests++;
            if ($passed) $passedTests++;
        } else {
            printTestResult($testName, false, "Test function not found");
            $totalTests++;
        }
    }
    
    // Summary
    printTestHeader("Test Summary");
    echo "Total Tests: $totalTests\n";
    echo "Passed: $passedTests\n";
    echo "Failed: " . ($totalTests - $passedTests) . "\n";
    echo "Success Rate: " . round(($passedTests / $totalTests) * 100, 1) . "%\n\n";
    
    if ($passedTests === $totalTests) {
        echo "🎉 All tests passed! Your system is ready to use.\n";
    } else {
        echo "⚠️  Some tests failed. Please fix the issues before using the system.\n";
    }
    
    return $passedTests === $totalTests;
}

// ========================================
// EXECUTION
// ========================================

if (php_sapi_name() === 'cli') {
    // Command line execution
    runAllTests();
} else {
    // Web execution
    header('Content-Type: text/plain');
    runAllTests();
}

?>
