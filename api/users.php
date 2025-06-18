<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        // Get all users
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

            echo json_encode($formatted_users);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'POST':
        // Handle different POST actions
        $input = json_decode(file_get_contents('php://input'), true);

        if (isset($input['action']) && $input['action'] === 'create') {
            // Create new user
            $user = $input['user'];

            if (!isset($user['id']) || !isset($user['name']) || !isset($user['username']) || !isset($user['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Required fields: id, name, username, password']);
                exit;
            }

            try {
                // Check if user already exists
                $checkStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? OR username = ?");
                $checkStmt->execute([$user['id'], $user['username']]);

                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'User ID or username already exists']);
                    exit;
                }

                // Insert new user
                $stmt = $pdo->prepare("
                    INSERT INTO users (id, name, username, password, vote_count, status, verified, registered_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $stmt->execute([
                    $user['id'],
                    $user['name'],
                    $user['username'],
                    $user['password'],
                    $user['voteCount'] ?? 20,
                    $user['status'] ?? 'Belum Voting',
                    $user['verified'] ? 1 : 0,
                    $user['registeredAt'] ?? date('Y-m-d H:i:s')
                ]);

                echo json_encode(['success' => true, 'message' => 'User created successfully']);

            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }

        } else {
            // Login user (existing functionality)
            if (!isset($input['username']) || !isset($input['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Username and password required']);
                exit;
            }

            try {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
                $stmt->execute([$input['username'], $input['password']]);
                $user = $stmt->fetch();

                if ($user) {
                    // Update last login
                    $updateStmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
                    $updateStmt->execute([$user['id']]);

                    // Format response
                    $response = [
                        'success' => true,
                        'user' => [
                            'id' => $user['id'],
                            'name' => $user['name'],
                            'username' => $user['username'],
                            'voteCount' => (int)$user['vote_count'],
                            'status' => $user['status'],
                            'verified' => (bool)$user['verified'],
                            'registeredAt' => $user['registered_at'],
                            'lastLogin' => date('Y-m-d H:i:s')
                        ]
                    ];
                    echo json_encode($response);
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Invalid credentials']);
                }
            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        break;

    case 'PUT':
        // Update user (verify, etc.)
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID required']);
            exit;
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

            if (!empty($updates)) {
                $params[] = $input['id'];
                $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);

                echo json_encode(['success' => true, 'message' => 'User updated']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No updates provided']);
            }
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete user(s)
        $input = json_decode(file_get_contents('php://input'), true);

        if (isset($input['deleteAll']) && $input['deleteAll'] === true) {
            // Delete all users
            try {
                $stmt = $pdo->prepare("DELETE FROM users");
                $stmt->execute();

                echo json_encode(['success' => true, 'message' => 'All users deleted', 'deletedCount' => $stmt->rowCount()]);
            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
        } else if (isset($input['id'])) {
            // Delete single user
            try {
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$input['id']]);

                if ($stmt->rowCount() > 0) {
                    echo json_encode(['success' => true, 'message' => 'User deleted']);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'User not found']);
                }
            } catch(PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'User ID or deleteAll flag required']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
