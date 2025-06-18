<?php
// JSON File Storage (No MySQL Required)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Data files
$usersFile = 'data/users.json';
$electionFile = 'data/election.json';
$dataDir = 'data';

// Create data directory if not exists
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

// Initialize files if not exist
if (!file_exists($usersFile)) {
    $defaultUsers = [
        [
            'id' => '001',
            'name' => 'John Doe',
            'username' => 'john.doe',
            'password' => 'password123',
            'voteCount' => 15,
            'status' => 'Belum Voting',
            'verified' => false,
            'registeredAt' => date('Y-m-d H:i:s'),
            'lastLogin' => null
        ],
        [
            'id' => '002',
            'name' => 'Jane Smith',
            'username' => 'jane.smith',
            'password' => 'mypass456',
            'voteCount' => 25,
            'status' => 'Belum Voting',
            'verified' => false,
            'registeredAt' => date('Y-m-d H:i:s'),
            'lastLogin' => null
        ],
        [
            'id' => '003',
            'name' => 'Ahmad Rahman',
            'username' => 'ahmad.rahman',
            'password' => 'secure789',
            'voteCount' => 10,
            'status' => 'Belum Voting',
            'verified' => false,
            'registeredAt' => date('Y-m-d H:i:s'),
            'lastLogin' => null
        ]
    ];
    file_put_contents($usersFile, json_encode($defaultUsers, JSON_PRETTY_PRINT));
}

if (!file_exists($electionFile)) {
    $defaultElection = [
        'status' => 'stopped',
        'updatedAt' => date('Y-m-d H:i:s')
    ];
    file_put_contents($electionFile, json_encode($defaultElection, JSON_PRETTY_PRINT));
}

// Helper functions
function readUsers() {
    global $usersFile;
    return json_decode(file_get_contents($usersFile), true);
}

function writeUsers($users) {
    global $usersFile;
    return file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
}

function readElection() {
    global $electionFile;
    return json_decode(file_get_contents($electionFile), true);
}

function writeElection($data) {
    global $electionFile;
    return file_put_contents($electionFile, json_encode($data, JSON_PRETTY_PRINT));
}

// Handle requests
$action = $_GET['action'] ?? '';

switch($action) {
    case 'users':
        if ($_SERVER['REQUEST_METHOD'] == 'GET') {
            echo json_encode(readUsers());
        } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
            // Login
            $input = json_decode(file_get_contents('php://input'), true);
            $users = readUsers();
            
            foreach ($users as &$user) {
                if ($user['username'] == $input['username'] && $user['password'] == $input['password']) {
                    $user['lastLogin'] = date('Y-m-d H:i:s');
                    writeUsers($users);
                    echo json_encode(['success' => true, 'user' => $user]);
                    exit;
                }
            }
            
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        } elseif ($_SERVER['REQUEST_METHOD'] == 'PUT') {
            // Update user
            $input = json_decode(file_get_contents('php://input'), true);
            $users = readUsers();
            
            foreach ($users as &$user) {
                if ($user['id'] == $input['id']) {
                    if (isset($input['verified'])) $user['verified'] = $input['verified'];
                    if (isset($input['status'])) $user['status'] = $input['status'];
                    writeUsers($users);
                    echo json_encode(['success' => true]);
                    exit;
                }
            }
            
            echo json_encode(['error' => 'User not found']);
        }
        break;
        
    case 'election':
        if ($_SERVER['REQUEST_METHOD'] == 'GET') {
            echo json_encode(readElection());
        } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $data = [
                'status' => $input['status'],
                'updatedAt' => date('Y-m-d H:i:s')
            ];
            writeElection($data);
            echo json_encode(['success' => true, 'status' => $input['status']]);
        }
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}
?>
