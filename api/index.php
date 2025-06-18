<?php
/**
 * KPU Monasmuda Institute - Main API Endpoint
 * 
 * This is the main API router that handles all database operations
 * for the voting system.
 */

require_once '../database/config.php';

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Log API request
logActivity('API', null, 'API_REQUEST', "Action: $action, Method: $method");

// ========================================
// API ROUTING
// ========================================

switch ($action) {
    
    // ========================================
    // USER MANAGEMENT
    // ========================================
    
    case 'get_users':
        if ($method !== 'GET') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        try {
            $stmt = $pdo->query("SELECT * FROM users ORDER BY id");
            $users = $stmt->fetchAll();
            
            // Format for frontend compatibility
            $formatted_users = array_map(function($user) {
                return [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'username' => $user['username'],
                    'password' => $user['password'],
                    'voteCount' => (int)$user['vote_count'],
                    'status' => $user['status'],
                    'verified' => (bool)$user['verified'],
                    'registeredAt' => $user['registered_at'],
                    'lastLogin' => $user['last_login']
                ];
            }, $users);
            
            echo ApiResponse::success($formatted_users, 'Users retrieved successfully');
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to retrieve users: ' . $e->getMessage(), 500);
        }
        break;
    
    case 'add_user':
        if ($method !== 'POST') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id'], $input['name'], $input['username'], $input['password'])) {
            echo ApiResponse::error('Missing required fields: id, name, username, password', 400);
            break;
        }
        
        try {
            // Check if user already exists
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? OR username = ?");
            $checkStmt->execute([$input['id'], $input['username']]);
            
            if ($checkStmt->fetch()) {
                echo ApiResponse::error('User ID or username already exists', 409);
                break;
            }
            
            // Insert new user
            $stmt = $pdo->prepare("
                INSERT INTO users (id, name, username, password, vote_count, verified, registered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $input['id'],
                $input['name'],
                $input['username'],
                $input['password'],
                $input['voteCount'] ?? 20,
                $input['verified'] ?? false,
                date('Y-m-d H:i:s')
            ]);
            
            logActivity('ADMIN', 'admin', 'ADD_USER', "Added user: {$input['username']}");
            echo ApiResponse::success(['id' => $input['id']], 'User added successfully');
            
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to add user: ' . $e->getMessage(), 500);
        }
        break;
    
    case 'update_user':
        if ($method !== 'PUT') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id'])) {
            echo ApiResponse::error('Missing required field: id', 400);
            break;
        }
        
        try {
            $updates = [];
            $params = [];
            
            if (isset($input['verified'])) {
                $updates[] = "verified = ?";
                $params[] = $input['verified'] ? 1 : 0;
            }
            
            if (isset($input['status'])) {
                $updates[] = "status = ?";
                $params[] = $input['status'];
            }
            
            if (isset($input['vote_count'])) {
                $updates[] = "vote_count = ?";
                $params[] = $input['vote_count'];
            }
            
            if (!empty($updates)) {
                $params[] = $input['id'];
                $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                logActivity('ADMIN', 'admin', 'UPDATE_USER', "Updated user: {$input['id']}");
                echo ApiResponse::success(null, 'User updated successfully');
            } else {
                echo ApiResponse::error('No updates provided', 400);
            }
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to update user: ' . $e->getMessage(), 500);
        }
        break;
    
    // ========================================
    // CANDIDATE MANAGEMENT
    // ========================================
    
    case 'get_candidates':
        if ($method !== 'GET') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        try {
            $stmt = $pdo->query("SELECT * FROM candidates ORDER BY category, position_number");
            $candidates = $stmt->fetchAll();
            echo ApiResponse::success($candidates, 'Candidates retrieved successfully');
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to retrieve candidates: ' . $e->getMessage(), 500);
        }
        break;
    
    case 'update_candidate':
        if ($method !== 'PUT') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['id'])) {
            echo ApiResponse::error('Missing required field: id', 400);
            break;
        }
        
        try {
            $updates = [];
            $params = [];
            
            if (isset($input['name'])) {
                $updates[] = "name = ?";
                $params[] = $input['name'];
            }
            
            if (isset($input['photo_url'])) {
                // Validate data URL length (max 16MB for LONGTEXT)
                if (strlen($input['photo_url']) > 16777215) {
                    echo ApiResponse::error('Photo URL too large (max 16MB)', 400);
                    break;
                }
                $updates[] = "photo_url = ?";
                $params[] = $input['photo_url'];
            }
            
            if (isset($input['description'])) {
                $updates[] = "description = ?";
                $params[] = $input['description'];
            }
            
            if (!empty($updates)) {
                $params[] = $input['id'];
                $sql = "UPDATE candidates SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                logActivity('ADMIN', 'admin', 'UPDATE_CANDIDATE', "Updated candidate: {$input['id']}");
                echo ApiResponse::success(null, 'Candidate updated successfully');
            } else {
                echo ApiResponse::error('No updates provided', 400);
            }
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to update candidate: ' . $e->getMessage(), 500);
        }
        break;
    
    // ========================================
    // VOTING OPERATIONS
    // ========================================
    
    case 'cast_vote':
        if ($method !== 'POST') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['user_id'], $input['candidate_id'], $input['vote_count'], $input['category'])) {
            echo ApiResponse::error('Missing required fields: user_id, candidate_id, vote_count, category', 400);
            break;
        }
        
        try {
            $pdo->beginTransaction();
            
            // Insert or update vote
            $stmt = $pdo->prepare("
                INSERT INTO votes (user_id, candidate_id, vote_count, category)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    vote_count = VALUES(vote_count),
                    voted_at = CURRENT_TIMESTAMP
            ");
            
            $stmt->execute([
                $input['user_id'],
                $input['candidate_id'],
                $input['vote_count'],
                $input['category']
            ]);
            
            // Update user status
            $stmt = $pdo->prepare("UPDATE users SET status = 'Sudah Voting', last_login = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$input['user_id']]);
            
            $pdo->commit();
            
            logActivity('USER', $input['user_id'], 'CAST_VOTE', 
                "Vote cast for {$input['candidate_id']} in {$input['category']} with {$input['vote_count']} votes");
            
            echo ApiResponse::success(null, 'Vote cast successfully');
            
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo ApiResponse::error('Failed to cast vote: ' . $e->getMessage(), 500);
        }
        break;
    
    // ========================================
    // RESULTS AND STATISTICS
    // ========================================
    
    case 'get_vote_results':
        if ($method !== 'GET') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        try {
            $stmt = $pdo->query("
                SELECT
                    v.candidate_id,
                    c.name as candidate_name,
                    v.category,
                    SUM(v.vote_count) as total_votes,
                    c.position_number
                FROM votes v
                LEFT JOIN candidates c ON v.candidate_id = c.id
                GROUP BY v.candidate_id, v.category
                ORDER BY v.category, c.position_number
            ");
            
            $results = $stmt->fetchAll();
            echo ApiResponse::success($results, 'Vote results retrieved successfully');
            
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to retrieve vote results: ' . $e->getMessage(), 500);
        }
        break;
    
    case 'get_statistics':
        if ($method !== 'GET') {
            echo ApiResponse::error('Method not allowed', 405);
            break;
        }
        
        try {
            $stats = getDatabaseStatus();
            
            // Additional statistics
            $stmt = $pdo->query("
                SELECT 
                    COUNT(DISTINCT user_id) as voters_participated,
                    SUM(vote_count) as total_votes_cast
                FROM votes
            ");
            $voteStats = $stmt->fetch();
            
            $stats = array_merge($stats, $voteStats);
            
            echo ApiResponse::success($stats, 'Statistics retrieved successfully');
            
        } catch (PDOException $e) {
            echo ApiResponse::error('Failed to retrieve statistics: ' . $e->getMessage(), 500);
        }
        break;
    
    // ========================================
    // SYSTEM STATUS
    // ========================================
    
    case 'health_check':
        $status = [
            'database' => checkDatabaseConnection(),
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0.0'
        ];
        
        if ($status['database']) {
            echo ApiResponse::success($status, 'System is healthy');
        } else {
            echo ApiResponse::error('Database connection failed', 503, $status);
        }
        break;
    
    // ========================================
    // DEFAULT CASE
    // ========================================
    
    default:
        echo ApiResponse::error('Invalid action or action not specified', 400, [
            'available_actions' => [
                'get_users', 'add_user', 'update_user',
                'get_candidates', 'update_candidate',
                'cast_vote', 'get_vote_results', 'get_statistics',
                'health_check'
            ]
        ]);
        break;
}

?>
