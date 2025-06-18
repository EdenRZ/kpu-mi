<?php
// ========================================
// KPU MONASMUDA INSTITUTE API
// Database Integration Layer
// ========================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Debug mode flag
define('DEBUG_MODE', true);

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
class Database {
    private $host = 'localhost';
    private $port = '3306';
    private $db_name = 'kpu_monasmuda';
    private $username = 'root';
    private $password = '';
    private $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
        return $this->conn;
    }
}

// API Response helper
class ApiResponse {
    public static function success($data = null, $message = 'Success') {
        return json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    public static function error($message = 'Error', $code = 400, $debug_info = null) {
        http_response_code($code);
        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // Add debug info if in debug mode
        if (DEBUG_MODE && $debug_info) {
            $response['debug'] = $debug_info;
        }

        return json_encode($response);
    }
}

// Main API handler
try {
    $database = new Database();
    $conn = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    switch ($action) {

        // ========================================
        // USER MANAGEMENT
        // ========================================

        case 'get_users':
            // Check if users table exists, if not return empty array
            try {
                $stmt = $conn->query("SELECT * FROM users ORDER BY id");
                $users = $stmt->fetchAll();
                echo ApiResponse::success($users);
            } catch (Exception $e) {
                // If table doesn't exist, return empty array
                echo ApiResponse::success([]);
            }
            break;

        case 'add_user':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO users (id, name, username, password, vote_count, verified) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['id'],
                $input['name'],
                $input['username'],
                $input['password'],
                $input['vote_count'] ?? 20,
                $input['verified'] ?? false
            ]);
            echo ApiResponse::success(['id' => $input['id']], 'User added successfully');
            break;

        case 'update_user':
            if ($method !== 'PUT') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $rawInput = file_get_contents('php://input');
            error_log("🔍 UPDATE_USER: Raw input received: " . $rawInput);

            $input = json_decode($rawInput, true);

            if (!$input) {
                error_log("❌ UPDATE_USER: JSON decode failed for input: " . $rawInput);
                echo ApiResponse::error('Invalid JSON input', 400);
                break;
            }

            error_log("📊 UPDATE_USER: Decoded input: " . json_encode($input));

            // Validate required fields
            if (!isset($input['id'])) {
                error_log("❌ UPDATE_USER: Missing user ID in input");
                echo ApiResponse::error('User ID is required', 400);
                break;
            }

            $user_id = $input['id'];
            error_log("👤 UPDATE_USER: Processing user ID: " . $user_id);

            // 🔥 FIXED: Only update fields that are explicitly provided and not empty
            $updates = [];
            $params = [];

            // Only update name if provided and not empty
            if (isset($input['name']) && trim($input['name']) !== '') {
                $updates[] = "name = ?";
                $params[] = trim($input['name']);
                error_log("Updating user {$user_id}: name='" . trim($input['name']) . "'");
            }

            // Only update username if provided and not empty
            if (isset($input['username']) && trim($input['username']) !== '') {
                $updates[] = "username = ?";
                $params[] = trim($input['username']);
                error_log("Updating user {$user_id}: username='" . trim($input['username']) . "'");
            }

            // Only update password if provided and not empty
            if (isset($input['password']) && trim($input['password']) !== '') {
                $updates[] = "password = ?";
                $params[] = trim($input['password']);
                error_log("Updating user {$user_id}: password updated");
            }

            // Only update vote_count if provided
            if (isset($input['vote_count']) || isset($input['voteCount'])) {
                $vote_count = 20; // default
                if (isset($input['vote_count'])) {
                    $vote_count = is_numeric($input['vote_count']) ? (int)$input['vote_count'] : 20;
                } elseif (isset($input['voteCount'])) {
                    $vote_count = is_numeric($input['voteCount']) ? (int)$input['voteCount'] : 20;
                }
                $updates[] = "vote_count = ?";
                $params[] = $vote_count;
                error_log("Updating user {$user_id}: vote_count={$vote_count}");
            }

            // Only update verified if provided
            if (isset($input['verified'])) {
                $verified = false; // default
                if (is_bool($input['verified'])) {
                    $verified = $input['verified'];
                } elseif (is_string($input['verified'])) {
                    $verified = ($input['verified'] === 'true' || $input['verified'] === '1');
                } elseif (is_numeric($input['verified'])) {
                    $verified = (bool)$input['verified'];
                }
                $updates[] = "verified = ?";
                $params[] = $verified ? 1 : 0;
                error_log("Updating user {$user_id}: verified=" . ($verified ? 'true' : 'false'));
            }

            // Only update status if provided and not empty
            if (isset($input['status']) && trim($input['status']) !== '') {
                $updates[] = "status = ?";
                $params[] = trim($input['status']);
                error_log("Updating user {$user_id}: status='" . trim($input['status']) . "'");
            }

            // Check if there are any fields to update
            if (empty($updates)) {
                echo ApiResponse::error('No valid fields to update', 400);
                break;
            }

            // Add user_id to params for WHERE clause
            $params[] = $user_id;

            try {
                $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
                error_log("🔍 UPDATE_USER: Executing SQL: {$sql}");
                error_log("🔍 UPDATE_USER: With params: " . json_encode($params));

                $stmt = $conn->prepare($sql);
                $result = $stmt->execute($params);

                error_log("🔍 UPDATE_USER: SQL execution result: " . ($result ? 'true' : 'false'));
                error_log("🔍 UPDATE_USER: Affected rows: " . $stmt->rowCount());

                if ($result && $stmt->rowCount() > 0) {
                    error_log("✅ UPDATE_USER: User updated successfully");
                    echo ApiResponse::success(null, 'User updated successfully');
                } else {
                    error_log("⚠️ UPDATE_USER: User not found or no changes made");
                    // 🔥 FIXED: Don't treat this as error - user might already have correct status
                    echo ApiResponse::success(null, 'User status already up to date');
                }
            } catch (Exception $e) {
                error_log("❌ UPDATE_USER: Database error: " . $e->getMessage());
                error_log("❌ UPDATE_USER: Stack trace: " . $e->getTraceAsString());
                echo ApiResponse::error('Failed to update user: ' . $e->getMessage(), 500);
            }
            break;

        case 'delete_user':
            if ($method !== 'DELETE') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $user_id = $_GET['id'] ?? '';

            if (empty($user_id)) {
                echo ApiResponse::error('User ID is required', 400);
                break;
            }

            // Start transaction to ensure data consistency
            $conn->beginTransaction();

            try {
                // First, check if user exists
                $stmt = $conn->prepare("SELECT id, name, username FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $user = $stmt->fetch();

                if (!$user) {
                    $conn->rollback();
                    echo ApiResponse::error('User not found', 404);
                    break;
                }

                // Delete user's votes first (to handle foreign key constraints)
                $stmt = $conn->prepare("DELETE FROM votes WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $deleted_votes = $stmt->rowCount();

                // Delete user's activity logs
                $stmt = $conn->prepare("DELETE FROM activity_log WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $deleted_logs = $stmt->rowCount();

                // Finally, delete the user
                $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $deleted_users = $stmt->rowCount();

                if ($deleted_users > 0) {
                    $conn->commit();
                    error_log("User deleted successfully: {$user['username']} (ID: {$user_id}), votes: {$deleted_votes}, logs: {$deleted_logs}");
                    echo ApiResponse::success([
                        'deleted_user' => $user,
                        'deleted_votes' => $deleted_votes,
                        'deleted_logs' => $deleted_logs
                    ], 'User deleted successfully');
                } else {
                    $conn->rollback();
                    echo ApiResponse::error('Failed to delete user', 500);
                }
            } catch (Exception $e) {
                $conn->rollback();
                error_log("Delete user error: " . $e->getMessage());
                echo ApiResponse::error('Failed to delete user: ' . $e->getMessage(), 500);
            }
            break;

        // ========================================
        // CANDIDATE MANAGEMENT
        // ========================================

        case 'get_candidates':
            try {
                $category = $_GET['category'] ?? null;
                $sql = "SELECT * FROM candidates";
                $params = [];

                if ($category) {
                    $sql .= " WHERE category = ?";
                    $params[] = $category;
                }

                $sql .= " ORDER BY category, position_number";

                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $candidates = $stmt->fetchAll();

                if (empty($candidates)) {
                    // 🔥 FIXED: Return default candidates with CORRECT NAMES that match dashboard mapping
                    $default_candidates = [
                        ['id' => 'presiden1', 'name' => 'NENENG & INAYAH', 'category' => 'presiden', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Presiden 1'],
                        ['id' => 'presiden2', 'name' => 'AISYAH & EVI', 'category' => 'presiden', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Presiden 2'],
                        ['id' => 'pm1', 'name' => 'KUKUH', 'category' => 'pm', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon PM 1'],
                        ['id' => 'pm2', 'name' => 'SAYYIDAH', 'category' => 'pm', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon PM 2'],
                        ['id' => 'parlemen1', 'name' => 'ADINUR KHOLIFAH', 'category' => 'parlemen', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 1'],
                        ['id' => 'parlemen2', 'name' => 'ENI FATMAWATI', 'category' => 'parlemen', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 2'],
                        ['id' => 'parlemen3', 'name' => 'FAIZAH MAULIDA', 'category' => 'parlemen', 'position_number' => 3, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 3'],
                        ['id' => 'parlemen4', 'name' => 'AHMAD NASHUKA', 'category' => 'parlemen', 'position_number' => 4, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 4']
                    ];

                    // Filter by category if specified
                    if ($category) {
                        $default_candidates = array_filter($default_candidates, function($candidate) use ($category) {
                            return $candidate['category'] === $category;
                        });
                    }

                    echo ApiResponse::success(array_values($default_candidates));
                } else {
                    echo ApiResponse::success($candidates);
                }
            } catch (Exception $e) {
                // 🔥 FIXED: If table doesn't exist, return default candidates with CORRECT NAMES
                $default_candidates = [
                    ['id' => 'presiden1', 'name' => 'NENENG & INAYAH', 'category' => 'presiden', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Presiden 1'],
                    ['id' => 'presiden2', 'name' => 'AISYAH & EVI', 'category' => 'presiden', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Presiden 2'],
                    ['id' => 'pm1', 'name' => 'KUKUH', 'category' => 'pm', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon PM 1'],
                    ['id' => 'pm2', 'name' => 'SAYYIDAH', 'category' => 'pm', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon PM 2'],
                    ['id' => 'parlemen1', 'name' => 'ADINUR KHOLIFAH', 'category' => 'parlemen', 'position_number' => 1, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 1'],
                    ['id' => 'parlemen2', 'name' => 'ENI FATMAWATI', 'category' => 'parlemen', 'position_number' => 2, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 2'],
                    ['id' => 'parlemen3', 'name' => 'FAIZAH MAULIDA', 'category' => 'parlemen', 'position_number' => 3, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 3'],
                    ['id' => 'parlemen4', 'name' => 'AHMAD NASHUKA', 'category' => 'parlemen', 'position_number' => 4, 'photo' => 'kandidat/kpulogo.jpg', 'description' => 'Calon Parlemen 4']
                ];

                $category = $_GET['category'] ?? null;
                if ($category) {
                    $default_candidates = array_filter($default_candidates, function($candidate) use ($category) {
                        return $candidate['category'] === $category;
                    });
                }

                echo ApiResponse::success(array_values($default_candidates));
            }
            break;

        case 'update_candidate':
            if ($method !== 'PUT') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            // Build dynamic update query based on provided fields
            $updates = [];
            $params = [];

            if (isset($input['name'])) {
                $updates[] = "name = ?";
                $params[] = $input['name'];
            }

            if (isset($input['photo_url']) || isset($input['photo'])) {
                $photo_url = $input['photo_url'] ?? $input['photo'] ?? 'kandidat/kpulogo.jpg';

                // Validate data URL length (max 16MB for LONGTEXT)
                if (strlen($photo_url) > 16777215) {
                    echo ApiResponse::error('Photo URL too large (max 16MB)', 400);
                    break;
                }

                // Log data URL info for debugging
                if (strpos($photo_url, 'data:image/') === 0) {
                    error_log("Storing data URL for candidate {$input['id']}: " . substr($photo_url, 0, 50) . "... (length: " . strlen($photo_url) . ")");
                }

                $updates[] = "photo_url = ?";
                $params[] = $photo_url;
            }

            if (isset($input['description'])) {
                $updates[] = "description = ?";
                $params[] = $input['description'];
            }

            if (empty($updates)) {
                echo ApiResponse::error('No fields to update', 400);
                break;
            }

            $sql = "UPDATE candidates SET " . implode(', ', $updates) . " WHERE id = ?";
            $params[] = $input['id'];

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            echo ApiResponse::success(null, 'Candidate updated successfully');
            break;

        // ========================================
        // VOTING SYSTEM
        // ========================================

        case 'cast_vote':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            // Enhanced logging and validation
            error_log("🗳️ CAST_VOTE: Starting vote submission process");

            $rawInput = file_get_contents('php://input');
            error_log("📥 Raw input received: " . $rawInput);

            $input = json_decode($rawInput, true);

            if (!$input) {
                error_log("❌ JSON decode failed for input: " . $rawInput);
                echo ApiResponse::error('Invalid JSON input', 400);
                break;
            }

            error_log("📊 Decoded input: " . json_encode($input));

            // Validate required fields
            if (empty($input['user_id'])) {
                error_log("❌ Missing user_id in input");
                echo ApiResponse::error('User ID is required', 400);
                break;
            }

            if (empty($input['category'])) {
                error_log("❌ Missing category in input");
                echo ApiResponse::error('Category is required', 400);
                break;
            }

            if (empty($input['votes']) || !is_array($input['votes'])) {
                error_log("❌ Missing or invalid votes array in input");
                echo ApiResponse::error('Votes array is required', 400);
                break;
            }

            // 🚨 ADDITIONAL VALIDATION: Check votes array content
            $validVotesCount = 0;
            foreach ($input['votes'] as $vote) {
                if (!isset($vote['candidate_id']) || empty($vote['candidate_id'])) {
                    error_log("❌ Vote missing candidate_id: " . json_encode($vote));
                    echo ApiResponse::error('All votes must have valid candidate_id', 400);
                    break 2; // Break out of both foreach and switch
                }

                if (!isset($vote['count']) || !is_numeric($vote['count']) || $vote['count'] < 0) {
                    error_log("❌ Vote has invalid count: " . json_encode($vote));
                    echo ApiResponse::error('All votes must have valid count (>= 0)', 400);
                    break 2; // Break out of both foreach and switch
                }

                if ($vote['count'] > 0) {
                    $validVotesCount++;
                }
            }

            // 🚨 CRITICAL: Must have at least one vote with count > 0
            if ($validVotesCount === 0) {
                error_log("❌ No valid votes found (all counts are 0)");
                echo ApiResponse::error('At least one vote must have count > 0', 400);
                break;
            }

            error_log("✅ Vote validation passed: {$validVotesCount} valid votes found");

            // Start transaction
            error_log("🔄 Starting database transaction");
            $conn->beginTransaction();

            try {
                // 🔥 ENHANCED USER VALIDATION: Check if user exists AND has valid data
                $stmt = $conn->prepare("SELECT id, name, username, password FROM users WHERE id = ?");
                $stmt->execute([$input['user_id']]);
                $user = $stmt->fetch();

                if (!$user) {
                    error_log("❌ User not found: " . $input['user_id']);
                    $conn->rollback();
                    echo ApiResponse::error('User not found', 404);
                    break;
                }

                // 🚨 CRITICAL VALIDATION: Check for empty/invalid user data
                if (empty($user['name']) || trim($user['name']) === '') {
                    error_log("❌ CRITICAL: User has empty name: " . $input['user_id']);
                    $conn->rollback();
                    echo ApiResponse::error('User has invalid name data', 400);
                    break;
                }

                if (empty($user['username']) || trim($user['username']) === '') {
                    error_log("❌ CRITICAL: User has empty username: " . $input['user_id']);
                    $conn->rollback();
                    echo ApiResponse::error('User has invalid username data', 400);
                    break;
                }

                if (empty($user['password']) || trim($user['password']) === '') {
                    error_log("❌ CRITICAL: User has empty password: " . $input['user_id']);
                    $conn->rollback();
                    echo ApiResponse::error('User has invalid password data', 400);
                    break;
                }

                // 🚨 SECURITY CHECK: Prevent auto-generated user IDs from voting
                if (preg_match('/^user_\d+$/', $input['user_id'])) {
                    error_log("❌ SECURITY: Auto-generated user ID attempted to vote: " . $input['user_id']);
                    $conn->rollback();
                    echo ApiResponse::error('Auto-generated user IDs are not allowed to vote', 403);
                    break;
                }

                error_log("✅ User validation passed: " . $user['username'] . " (ID: " . $user['id'] . ")");

                // Delete existing votes for this user and category
                error_log("🗑️ Deleting existing votes for user " . $input['user_id'] . " category " . $input['category']);
                $stmt = $conn->prepare("DELETE FROM votes WHERE user_id = ? AND category = ?");
                $stmt->execute([$input['user_id'], $input['category']]);
                $deletedRows = $stmt->rowCount();
                error_log("✅ Deleted " . $deletedRows . " existing votes");

                // Insert new votes
                error_log("📥 Inserting new votes");
                $stmt = $conn->prepare("INSERT INTO votes (user_id, candidate_id, vote_count, category) VALUES (?, ?, ?, ?)");
                $insertedVotes = 0;

                foreach ($input['votes'] as $vote) {
                    if ($vote['count'] > 0) {
                        error_log("📊 Inserting vote: " . $vote['candidate_id'] . " = " . $vote['count']);
                        $stmt->execute([
                            $input['user_id'],
                            $vote['candidate_id'],
                            $vote['count'],
                            $input['category']
                        ]);
                        $insertedVotes++;
                        error_log("✅ Vote inserted successfully");
                    } else {
                        error_log("⏭️ Skipping vote with 0 count: " . $vote['candidate_id']);
                    }
                }

                error_log("✅ Total votes inserted: " . $insertedVotes);

                // Update user status
                error_log("👤 Updating user status to 'Sudah Voting'");
                $stmt = $conn->prepare("UPDATE users SET status = 'Sudah Voting', last_login = NOW() WHERE id = ?");
                $stmt->execute([$input['user_id']]);
                $updatedRows = $stmt->rowCount();
                error_log("✅ User status updated, affected rows: " . $updatedRows);

                $conn->commit();
                error_log("✅ Transaction committed successfully");

                echo ApiResponse::success([
                    'user_id' => $input['user_id'],
                    'category' => $input['category'],
                    'votes_inserted' => $insertedVotes,
                    'votes_deleted' => $deletedRows
                ], 'Votes cast successfully');

            } catch (Exception $e) {
                $conn->rollback();
                error_log("❌ Vote casting failed: " . $e->getMessage());
                error_log("❌ Stack trace: " . $e->getTraceAsString());
                echo ApiResponse::error('Failed to cast votes: ' . $e->getMessage());
            }
            break;

        case 'get_vote_results':
            try {
                // Try to get results from votes table with candidate info
                $sql = "SELECT
                    v.candidate_id,
                    c.name as candidate_name,
                    v.category,
                    SUM(v.vote_count) as total_votes,
                    c.position_number
                FROM votes v
                LEFT JOIN candidates c ON v.candidate_id = c.id
                GROUP BY v.candidate_id, v.category
                ORDER BY v.category, c.position_number";

                $stmt = $conn->query($sql);
                $results = $stmt->fetchAll();

                // 🔥 FIXED: Add fallback candidate names for dashboard compatibility with CORRECT NAMES
                $candidateNameMapping = [
                    'presiden1' => 'NENENG & INAYAH',
                    'presiden2' => 'AISYAH & EVI',
                    'pm1' => 'KUKUH',
                    'pm2' => 'SAYYIDAH',
                    'parlemen1' => 'ADINUR KHOLIFAH',
                    'parlemen2' => 'ENI FATMAWATI',
                    'parlemen3' => 'FAIZAH MAULIDA',
                    'parlemen4' => 'AHMAD NASHUKA'
                ];

                // Ensure all candidates are included with fallback names
                foreach ($results as &$result) {
                    if (empty($result['candidate_name']) && isset($candidateNameMapping[$result['candidate_id']])) {
                        $result['candidate_name'] = $candidateNameMapping[$result['candidate_id']];
                    }
                }

                echo ApiResponse::success($results);
            } catch (Exception $e) {
                // If tables don't exist, return empty array
                echo ApiResponse::success([]);
            }
            break;

        // ========================================
        // ELECTION MANAGEMENT
        // ========================================

        case 'get_election_status':
            try {
                $stmt = $conn->query("SELECT * FROM election_status WHERE id = 1");
                $status = $stmt->fetch();
                if (!$status) {
                    // Return default status if no record found
                    $status = [
                        'id' => 1,
                        'status' => 'stopped',
                        'started_at' => null,
                        'ended_at' => null
                    ];
                }
                echo ApiResponse::success($status);
            } catch (Exception $e) {
                // If table doesn't exist, return default status
                $default_status = [
                    'id' => 1,
                    'status' => 'stopped',
                    'started_at' => null,
                    'ended_at' => null
                ];
                echo ApiResponse::success($default_status);
            }
            break;

        case 'update_election_status':
            if ($method !== 'PUT') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $status = $input['status'];

            $sql = "UPDATE election_status SET status = ?";
            $params = [$status];

            if ($status === 'running') {
                $sql .= ", started_at = NOW()";
            } elseif ($status === 'ended') {
                $sql .= ", ended_at = NOW()";
            }

            $sql .= " WHERE id = 1";

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            echo ApiResponse::success(null, 'Election status updated');
            break;

        // ========================================
        // ACTIVITY LOG
        // ========================================

        case 'log_activity':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            try {
                $input = json_decode(file_get_contents('php://input'), true);

                if (!$input) {
                    echo ApiResponse::error('Invalid JSON input', 400);
                    break;
                }

                // 🔥 ENHANCED: Validate and sanitize input data
                $user_type = isset($input['user_type']) && $input['user_type'] !== 'undefined' ? $input['user_type'] : 'UNKNOWN';
                $user_id = isset($input['user_id']) && $input['user_id'] !== 'undefined' && $input['user_id'] !== null ? $input['user_id'] : null;
                $action = isset($input['action']) && $input['action'] !== 'undefined' ? $input['action'] : 'UNKNOWN_ACTION';
                $details = isset($input['details']) && $input['details'] !== 'undefined' ? $input['details'] : '';

                error_log("Activity log input: " . json_encode([
                    'user_type' => $user_type,
                    'user_id' => $user_id,
                    'action' => $action,
                    'details' => $details
                ]));

                // Try to insert activity log
                $stmt = $conn->prepare("INSERT INTO activity_log (user_type, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([
                    $user_type,
                    $user_id,
                    $action,
                    $details,
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);

                error_log("Activity logged successfully: {$user_type} - {$user_id} - {$action}");
                echo ApiResponse::success(null, 'Activity logged successfully');
            } catch (Exception $e) {
                // If activity_log table doesn't exist, just return success
                // This prevents the system from breaking due to missing audit table
                error_log("Activity log error: " . $e->getMessage());
                echo ApiResponse::success(null, 'Activity logged (fallback - table may not exist)');
            }
            break;

        case 'get_activity_log':
            try {
                $limit = $_GET['limit'] ?? 50;
                $stmt = $conn->prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?");
                $stmt->execute([$limit]);
                $logs = $stmt->fetchAll();

                // 🔥 ENHANCED: Sanitize output data to prevent undefined values
                $sanitizedLogs = array_map(function($log) {
                    return [
                        'id' => $log['id'] ?? null,
                        'user_type' => $log['user_type'] ?? 'UNKNOWN',
                        'user_id' => $log['user_id'] ?? 'UNKNOWN',
                        'action' => $log['action'] ?? 'UNKNOWN_ACTION',
                        'details' => $log['details'] ?? '',
                        'ip_address' => $log['ip_address'] ?? 'unknown',
                        'created_at' => $log['created_at'] ?? null,
                        'timestamp' => $log['created_at'] ?? null // Add timestamp alias for compatibility
                    ];
                }, $logs);

                error_log("Activity log retrieved: " . count($sanitizedLogs) . " entries");
                echo ApiResponse::success($sanitizedLogs);
            } catch (Exception $e) {
                // If activity_log table doesn't exist, return empty array
                error_log("Get activity log error: " . $e->getMessage());
                echo ApiResponse::success([]);
            }
            break;

        // ========================================
        // BULK OPERATIONS
        // ========================================

        case 'reset_all_votes':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $conn->beginTransaction();
            try {
                $conn->exec("DELETE FROM votes");
                $conn->exec("UPDATE users SET status = 'Belum Voting'");
                $conn->exec("UPDATE election_status SET status = 'stopped', started_at = NULL, ended_at = NULL WHERE id = 1");
                $conn->commit();
                echo ApiResponse::success(null, 'All votes reset successfully');
            } catch (Exception $e) {
                $conn->rollback();
                echo ApiResponse::error('Failed to reset votes: ' . $e->getMessage());
            }
            break;

        case 'reset_user_votes':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $user_id = $input['user_id'] ?? '';

            if (empty($user_id)) {
                echo ApiResponse::error('User ID is required', 400);
                break;
            }

            $conn->beginTransaction();
            try {
                // Check if user exists
                $stmt = $conn->prepare("SELECT id, name, username FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $user = $stmt->fetch();

                if (!$user) {
                    $conn->rollback();
                    echo ApiResponse::error('User not found', 404);
                    break;
                }

                // Delete user's votes
                $stmt = $conn->prepare("DELETE FROM votes WHERE user_id = ?");
                $stmt->execute([$user_id]);
                $deleted_votes = $stmt->rowCount();

                // Reset user status to 'Belum Voting'
                $stmt = $conn->prepare("UPDATE users SET status = 'Belum Voting', last_login = NULL WHERE id = ?");
                $stmt->execute([$user_id]);

                $conn->commit();

                error_log("User votes reset successfully: {$user['username']} (ID: {$user_id}), deleted votes: {$deleted_votes}");
                echo ApiResponse::success([
                    'user' => $user,
                    'deleted_votes' => $deleted_votes
                ], 'User votes reset successfully');

            } catch (Exception $e) {
                $conn->rollback();
                error_log("Reset user votes error: " . $e->getMessage());
                echo ApiResponse::error('Failed to reset user votes: ' . $e->getMessage(), 500);
            }
            break;

        case 'bulk_add_users':
            if ($method !== 'POST') {
                echo ApiResponse::error('Method not allowed', 405);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $users = $input['users'];

            $conn->beginTransaction();
            try {
                $stmt = $conn->prepare("INSERT INTO users (id, name, username, password, vote_count, verified) VALUES (?, ?, ?, ?, ?, ?)");

                foreach ($users as $user) {
                    $stmt->execute([
                        $user['id'],
                        $user['name'],
                        $user['username'],
                        $user['password'],
                        $user['vote_count'] ?? 20,
                        $user['verified'] ?? false
                    ]);
                }

                $conn->commit();
                echo ApiResponse::success(null, count($users) . ' users added successfully');
            } catch (Exception $e) {
                $conn->rollback();
                echo ApiResponse::error('Failed to add users: ' . $e->getMessage());
            }
            break;

        // ========================================
        // CANDIDATES MANAGEMENT (ENHANCED) - REMOVED DUPLICATES
        // ========================================

        // ========================================
        // STATISTICS
        // ========================================

        case 'get_statistics':
            try {
                $stats = [];

                // Total users
                try {
                    $stmt = $conn->query("SELECT COUNT(*) as total FROM users");
                    $stats['total_users'] = $stmt->fetch()['total'];
                } catch (Exception $e) {
                    $stats['total_users'] = 0;
                }

                // Users who voted
                try {
                    $stmt = $conn->query("SELECT COUNT(*) as total FROM users WHERE status = 'Sudah Voting'");
                    $stats['voted_users'] = $stmt->fetch()['total'];
                } catch (Exception $e) {
                    $stats['voted_users'] = 0;
                }

                // Total votes cast
                try {
                    $stmt = $conn->query("SELECT SUM(vote_count) as total FROM votes");
                    $result = $stmt->fetch();
                    $stats['total_votes'] = $result['total'] ?? 0;
                } catch (Exception $e) {
                    $stats['total_votes'] = 0;
                }

                // Participation rate
                $stats['participation_rate'] = $stats['total_users'] > 0 ?
                    round(($stats['voted_users'] / $stats['total_users']) * 100, 2) : 0;

                echo ApiResponse::success($stats);
            } catch (Exception $e) {
                // Return default stats if database error
                $default_stats = [
                    'total_users' => 0,
                    'voted_users' => 0,
                    'total_votes' => 0,
                    'participation_rate' => 0
                ];
                echo ApiResponse::success($default_stats);
            }
            break;

        case 'get_user_votes':
            try {
                $user_id = $_GET['user_id'] ?? null;

                if (!$user_id) {
                    echo ApiResponse::error('User ID is required', 400);
                    break;
                }

                $sql = "SELECT
                    v.candidate_id,
                    c.name as candidate_name,
                    v.category,
                    v.vote_count,
                    v.voted_at
                FROM votes v
                LEFT JOIN candidates c ON v.candidate_id = c.id
                WHERE v.user_id = ?
                ORDER BY v.category, v.voted_at";

                $stmt = $conn->prepare($sql);
                $stmt->execute([$user_id]);
                $userVotes = $stmt->fetchAll();

                // 🔥 FIXED: Add fallback candidate names if needed with CORRECT NAMES
                $candidateNameMapping = [
                    'presiden1' => 'NENENG & INAYAH',
                    'presiden2' => 'AISYAH & EVI',
                    'pm1' => 'KUKUH',
                    'pm2' => 'SAYYIDAH',
                    'parlemen1' => 'ADINUR KHOLIFAH',
                    'parlemen2' => 'ENI FATMAWATI',
                    'parlemen3' => 'FAIZAH MAULIDA',
                    'parlemen4' => 'AHMAD NASHUKA'
                ];

                foreach ($userVotes as &$vote) {
                    if (empty($vote['candidate_name']) && isset($candidateNameMapping[$vote['candidate_id']])) {
                        $vote['candidate_name'] = $candidateNameMapping[$vote['candidate_id']];
                    }
                }

                echo ApiResponse::success($userVotes);
            } catch (Exception $e) {
                echo ApiResponse::error('Failed to get user votes: ' . $e->getMessage());
            }
            break;

        case 'get_voting_activity':
            try {
                $limit = $_GET['limit'] ?? 100;
                $category = $_GET['category'] ?? null;

                $sql = "SELECT
                    CONCAT('***', SUBSTRING(v.user_id, -3)) as masked_user_id,
                    v.candidate_id,
                    c.name as candidate_name,
                    v.category,
                    v.vote_count,
                    v.voted_at
                FROM votes v
                LEFT JOIN candidates c ON v.candidate_id = c.id";

                $params = [];

                if ($category && $category !== 'all') {
                    $sql .= " WHERE v.category = ?";
                    $params[] = $category;
                }

                $sql .= " ORDER BY v.voted_at DESC LIMIT ?";
                $params[] = (int)$limit;

                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $activities = $stmt->fetchAll();

                // Add fallback candidate names
                $candidateNameMapping = [
                    'presiden1' => 'NENENG & INAYAH',
                    'presiden2' => 'AISYAH & EVI',
                    'pm1' => 'KUKUH',
                    'pm2' => 'SAYYIDAH',
                    'parlemen1' => 'ADINUR KHOLIFAH',
                    'parlemen2' => 'ENI FATMAWATI',
                    'parlemen3' => 'FAIZAH MAULIDA',
                    'parlemen4' => 'AHMAD NASHUKA'
                ];

                foreach ($activities as &$activity) {
                    if (empty($activity['candidate_name']) && isset($candidateNameMapping[$activity['candidate_id']])) {
                        $activity['candidate_name'] = $candidateNameMapping[$activity['candidate_id']];
                    }
                }

                echo ApiResponse::success($activities);
            } catch (Exception $e) {
                // If tables don't exist, return empty array
                echo ApiResponse::success([]);
            }
            break;

        default:
            echo ApiResponse::error('Invalid action', 400);
            break;
    }

} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());

    $debug_info = null;
    if (DEBUG_MODE) {
        $debug_info = [
            'error_message' => $e->getMessage(),
            'error_file' => $e->getFile(),
            'error_line' => $e->getLine(),
            'request_method' => $_SERVER['REQUEST_METHOD'],
            'request_action' => $_GET['action'] ?? 'none',
            'php_version' => PHP_VERSION,
            'mysql_available' => extension_loaded('pdo_mysql')
        ];
    }

    echo ApiResponse::error('Internal server error: ' . $e->getMessage(), 500, $debug_info);
}
