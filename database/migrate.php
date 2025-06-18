<?php
/**
 * KPU Monasmuda Institute - Database Migration Script
 * 
 * This script handles database migrations and updates
 */

require_once 'config.php';

// ========================================
// MIGRATION FUNCTIONS
// ========================================

function printMigrationHeader($title) {
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "  " . strtoupper($title) . "\n";
    echo str_repeat("=", 50) . "\n";
}

function printMigrationStep($step, $description) {
    echo sprintf("[%d] %s\n", $step, $description);
}

function printMigrationSuccess($message) {
    echo "✅ " . $message . "\n";
}

function printMigrationError($message) {
    echo "❌ " . $message . "\n";
}

// ========================================
// MIGRATION DEFINITIONS
// ========================================

$migrations = [
    '001_initial_setup' => [
        'description' => 'Initial database setup with all tables',
        'sql' => 'setup.sql'
    ],
    '002_add_activity_log' => [
        'description' => 'Add activity logging table',
        'sql' => 'create_activity_log_table.sql'
    ],
    '003_update_photo_url' => [
        'description' => 'Update photo URL field for data URL support',
        'sql' => 'update_photo_url_field.sql'
    ]
];

// ========================================
// MIGRATION TRACKING
// ========================================

function createMigrationTable($pdo) {
    $sql = "
        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_migration_name (migration_name)
        )
    ";
    
    $pdo->exec($sql);
}

function isMigrationExecuted($pdo, $migrationName) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM migrations WHERE migration_name = ?");
    $stmt->execute([$migrationName]);
    return $stmt->fetchColumn() > 0;
}

function markMigrationExecuted($pdo, $migrationName) {
    $stmt = $pdo->prepare("INSERT INTO migrations (migration_name) VALUES (?)");
    $stmt->execute([$migrationName]);
}

// ========================================
// MIGRATION EXECUTION
// ========================================

function executeMigration($pdo, $migrationName, $migration) {
    printMigrationStep(1, "Executing migration: $migrationName");
    printMigrationStep(2, "Description: {$migration['description']}");
    
    try {
        $pdo->beginTransaction();
        
        // Execute SQL file if specified
        if (isset($migration['sql'])) {
            $sqlFile = __DIR__ . '/' . $migration['sql'];
            
            if (!file_exists($sqlFile)) {
                throw new Exception("SQL file not found: $sqlFile");
            }
            
            $sql = file_get_contents($sqlFile);
            
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
        }
        
        // Execute custom function if specified
        if (isset($migration['function']) && is_callable($migration['function'])) {
            $migration['function']($pdo);
        }
        
        // Mark migration as executed
        markMigrationExecuted($pdo, $migrationName);
        
        $pdo->commit();
        printMigrationSuccess("Migration $migrationName completed successfully");
        
        return true;
        
    } catch (Exception $e) {
        $pdo->rollBack();
        printMigrationError("Migration $migrationName failed: " . $e->getMessage());
        return false;
    }
}

// ========================================
// MAIN MIGRATION FUNCTIONS
// ========================================

function runMigrations($pdo, $migrations) {
    printMigrationHeader("Database Migrations");
    
    // Create migration tracking table
    createMigrationTable($pdo);
    
    $executed = 0;
    $skipped = 0;
    $failed = 0;
    
    foreach ($migrations as $migrationName => $migration) {
        if (isMigrationExecuted($pdo, $migrationName)) {
            echo "⏭️  Skipping $migrationName (already executed)\n";
            $skipped++;
            continue;
        }
        
        if (executeMigration($pdo, $migrationName, $migration)) {
            $executed++;
        } else {
            $failed++;
            break; // Stop on first failure
        }
    }
    
    printMigrationHeader("Migration Summary");
    echo "Executed: $executed\n";
    echo "Skipped: $skipped\n";
    echo "Failed: $failed\n";
    
    if ($failed > 0) {
        printMigrationError("Some migrations failed. Please fix the issues and try again.");
        return false;
    }
    
    printMigrationSuccess("All migrations completed successfully!");
    return true;
}

function showMigrationStatus($pdo, $migrations) {
    printMigrationHeader("Migration Status");
    
    createMigrationTable($pdo);
    
    foreach ($migrations as $migrationName => $migration) {
        $status = isMigrationExecuted($pdo, $migrationName) ? "✅ EXECUTED" : "⏳ PENDING";
        echo sprintf("%-30s %s\n", $migrationName, $status);
    }
}

function resetMigrations($pdo) {
    printMigrationHeader("Reset Migrations");
    
    $confirm = readline("Are you sure you want to reset all migrations? This will drop all tables! (yes/no): ");
    
    if (strtolower($confirm) !== 'yes') {
        echo "Migration reset cancelled.\n";
        return false;
    }
    
    try {
        // Drop all tables
        $tables = ['votes', 'activity_log', 'candidates', 'users', 'admin_users', 'election_settings', 'migrations'];
        
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        foreach ($tables as $table) {
            $pdo->exec("DROP TABLE IF EXISTS $table");
            echo "Dropped table: $table\n";
        }
        
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        printMigrationSuccess("All migrations reset successfully!");
        return true;
        
    } catch (Exception $e) {
        printMigrationError("Failed to reset migrations: " . $e->getMessage());
        return false;
    }
}

// ========================================
// COMMAND LINE INTERFACE
// ========================================

function showHelp() {
    echo "KPU Monasmuda Institute - Database Migration Tool\n";
    echo "Usage: php migrate.php [command]\n\n";
    echo "Commands:\n";
    echo "  migrate    Run pending migrations\n";
    echo "  status     Show migration status\n";
    echo "  reset      Reset all migrations (WARNING: Drops all tables!)\n";
    echo "  help       Show this help message\n\n";
}

// ========================================
// MAIN EXECUTION
// ========================================

if (php_sapi_name() === 'cli') {
    // Command line execution
    global $pdo, $migrations;
    
    $command = $argv[1] ?? 'help';
    
    switch ($command) {
        case 'migrate':
            runMigrations($pdo, $migrations);
            break;
            
        case 'status':
            showMigrationStatus($pdo, $migrations);
            break;
            
        case 'reset':
            resetMigrations($pdo);
            break;
            
        case 'help':
        default:
            showHelp();
            break;
    }
} else {
    // Web execution
    header('Content-Type: text/plain');
    
    $action = $_GET['action'] ?? 'status';
    
    switch ($action) {
        case 'migrate':
            runMigrations($pdo, $migrations);
            break;
            
        case 'status':
            showMigrationStatus($pdo, $migrations);
            break;
            
        default:
            echo "KPU Monasmuda Institute - Database Migration Tool\n";
            echo "Available actions:\n";
            echo "  ?action=status   - Show migration status\n";
            echo "  ?action=migrate  - Run pending migrations\n";
            break;
    }
}

?>
