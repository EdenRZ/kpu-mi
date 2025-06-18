<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        // Get election status
        try {
            $stmt = $pdo->prepare("SELECT setting_value FROM election_settings WHERE setting_key = 'election_status'");
            $stmt->execute();
            $result = $stmt->fetch();
            
            $status = $result ? $result['setting_value'] : 'stopped';
            echo json_encode(['status' => $status]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'POST':
        // Update election status
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Status required']);
            exit;
        }
        
        $validStatuses = ['stopped', 'running', 'ended'];
        if (!in_array($input['status'], $validStatuses)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO election_settings (setting_key, setting_value) 
                VALUES ('election_status', ?) 
                ON DUPLICATE KEY UPDATE setting_value = ?
            ");
            $stmt->execute([$input['status'], $input['status']]);
            
            // Log admin action
            if (isset($input['admin_user'])) {
                $logStmt = $pdo->prepare("
                    INSERT INTO admin_logs (admin_user, action, details, category) 
                    VALUES (?, ?, ?, 'election')
                ");
                $action = "Election status changed to: " . $input['status'];
                $logStmt->execute([$input['admin_user'], $action, json_encode($input)]);
            }
            
            echo json_encode(['success' => true, 'status' => $input['status']]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}
?>
