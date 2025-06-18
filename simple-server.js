// Simple Node.js Server (No PHP Required)
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Data storage (JSON files)
const dataDir = './data';
const usersFile = path.join(dataDir, 'users.json');
const electionFile = path.join(dataDir, 'election.json');

// Create data directory
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('📁 Created data directory');
}

// Initialize default data
const defaultUsers = [
    {
        id: '001',
        name: 'John Doe',
        username: 'john.doe',
        password: 'password123',
        voteCount: 15,
        status: 'Belum Voting',
        verified: false,
        registeredAt: new Date().toISOString(),
        lastLogin: null
    },
    {
        id: '002',
        name: 'Jane Smith',
        username: 'jane.smith',
        password: 'mypass456',
        voteCount: 25,
        status: 'Belum Voting',
        verified: false,
        registeredAt: new Date().toISOString(),
        lastLogin: null
    },
    {
        id: '003',
        name: 'Ahmad Rahman',
        username: 'ahmad.rahman',
        password: 'secure789',
        voteCount: 10,
        status: 'Belum Voting',
        verified: false,
        registeredAt: new Date().toISOString(),
        lastLogin: null
    }
];

const defaultElection = {
    status: 'stopped',
    updatedAt: new Date().toISOString()
};

// Initialize files
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
    console.log('👥 Created default users');
}
if (!fs.existsSync(electionFile)) {
    fs.writeFileSync(electionFile, JSON.stringify(defaultElection, null, 2));
    console.log('🗳️ Created election settings');
}

// Helper functions
function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (e) {
        return defaultUsers;
    }
}

function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function readElection() {
    try {
        return JSON.parse(fs.readFileSync(electionFile, 'utf8'));
    } catch (e) {
        return defaultElection;
    }
}

function writeElection(data) {
    fs.writeFileSync(electionFile, JSON.stringify(data, null, 2));
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

// Create server
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log(`${req.method} ${pathname}`);

    // API routes
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, parsedUrl.query);
        return;
    }

    // Static file serving
    let filePath = pathname === '/' ? '/login.html' : pathname;
    filePath = path.join(__dirname, filePath);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found: ' + pathname);
            } else {
                res.writeHead(500);
                res.end('Server error: ' + err.message);
            }
        } else {
            const ext = path.extname(filePath);
            const contentType = mimeTypes[ext] || 'text/plain';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// API handler
function handleAPI(req, res, pathname, query) {
    res.setHeader('Content-Type', 'application/json');

    try {
        if (pathname === '/api/users') {
            if (req.method === 'GET') {
                const users = readUsers();
                res.end(JSON.stringify(users));
            } else if (req.method === 'POST') {
                // Login
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const input = JSON.parse(body);
                        const users = readUsers();
                        
                        const user = users.find(u => 
                            u.username === input.username && u.password === input.password
                        );
                        
                        if (user) {
                            user.lastLogin = new Date().toISOString();
                            writeUsers(users);
                            res.end(JSON.stringify({ success: true, user }));
                        } else {
                            res.writeHead(401);
                            res.end(JSON.stringify({ error: 'Invalid credentials' }));
                        }
                    } catch (e) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
            } else if (req.method === 'PUT') {
                // Update user
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const input = JSON.parse(body);
                        const users = readUsers();
                        
                        const userIndex = users.findIndex(u => u.id === input.id);
                        if (userIndex !== -1) {
                            if (input.verified !== undefined) users[userIndex].verified = input.verified;
                            if (input.status !== undefined) users[userIndex].status = input.status;
                            writeUsers(users);
                            res.end(JSON.stringify({ success: true }));
                        } else {
                            res.writeHead(404);
                            res.end(JSON.stringify({ error: 'User not found' }));
                        }
                    } catch (e) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
            }
        } else if (pathname === '/api/election') {
            if (req.method === 'GET') {
                const election = readElection();
                res.end(JSON.stringify(election));
            } else if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const input = JSON.parse(body);
                        const data = {
                            status: input.status,
                            updatedAt: new Date().toISOString()
                        };
                        writeElection(data);
                        res.end(JSON.stringify({ success: true, status: input.status }));
                    } catch (e) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    }
                });
            }
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error: ' + error.message }));
    }
}

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🗃️ Data stored in: ${dataDir}`);
    console.log(`\n🔗 Access points:`);
    console.log(`   Login: http://localhost:${PORT}/login.html`);
    console.log(`   Admin: http://localhost:${PORT}/admin-login.html`);
    console.log(`   API Users: http://localhost:${PORT}/api/users`);
    console.log(`   API Election: http://localhost:${PORT}/api/election`);
    console.log(`\n✅ Cross-browser sync enabled!`);
    console.log(`✅ No PHP or MySQL required!`);
});
