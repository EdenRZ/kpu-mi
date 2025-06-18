// KPU Server - Node.js Backend
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database files
const DB_FILES = {
    users: './data/users.json',
    votes: './data/votes.json',
    stats: './data/stats.json'
};

// Ensure data directory exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Initialize database files
function initializeDatabase() {
    // Users
    if (!fs.existsSync(DB_FILES.users)) {
        const defaultUsers = [
            {
                id: '001',
                name: 'John Doe',
                username: 'john.doe',
                password: 'password123',
                voteCount: 15,
                status: 'Belum Voting',
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
                registeredAt: new Date().toISOString(),
                lastLogin: null
            }
        ];
        fs.writeFileSync(DB_FILES.users, JSON.stringify(defaultUsers, null, 2));
    }

    // Votes
    if (!fs.existsSync(DB_FILES.votes)) {
        fs.writeFileSync(DB_FILES.votes, JSON.stringify([], null, 2));
    }

    // Stats
    if (!fs.existsSync(DB_FILES.stats)) {
        const defaultStats = {
            totalVoters: 0,
            votesReceived: 0,
            participation: 0,
            candidates: 3,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILES.stats, JSON.stringify(defaultStats, null, 2));
    }
}

// Helper functions
function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
        return [];
    }
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${file}:`, error);
        return false;
    }
}

function updateStats() {
    const users = readJSON(DB_FILES.users);
    const votes = readJSON(DB_FILES.votes);

    const totalVoters = users.length;
    const votesReceived = users.filter(user => user.status === 'Sudah Voting').length;
    const participation = totalVoters > 0 ? (votesReceived / totalVoters * 100).toFixed(1) : 0;

    const stats = {
        totalVoters,
        votesReceived,
        participation,
        candidates: 3,
        lastUpdated: new Date().toISOString()
    };

    writeJSON(DB_FILES.stats, stats);
    return stats;
}

// API Routes

// Get all users
app.get('/api/users', (req, res) => {
    const users = readJSON(DB_FILES.users);
    res.json(users);
});

// Add new user
app.post('/api/users', (req, res) => {
    const users = readJSON(DB_FILES.users);
    const { name, username, password, voteCount } = req.body;

    // Check if username exists
    if (users.find(user => user.username === username)) {
        return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const newUser = {
        id: String(users.length + 1).padStart(3, '0'),
        name,
        username,
        password,
        voteCount: parseInt(voteCount),
        status: 'Belum Voting',
        registeredAt: new Date().toISOString(),
        lastLogin: null
    };

    users.push(newUser);
    writeJSON(DB_FILES.users, users);
    updateStats();

    res.json({ success: true, user: newUser });
});

// Update user
app.put('/api/users/:id', (req, res) => {
    const users = readJSON(DB_FILES.users);
    const userIndex = users.findIndex(user => user.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    users[userIndex] = { ...users[userIndex], ...req.body };
    writeJSON(DB_FILES.users, users);
    updateStats();

    res.json({ success: true, user: users[userIndex] });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    const users = readJSON(DB_FILES.users);
    const userIndex = users.findIndex(user => user.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    users.splice(userIndex, 1);
    writeJSON(DB_FILES.users, users);
    updateStats();

    res.json({ success: true });
});

// Login
app.post('/api/login', (req, res) => {
    const users = readJSON(DB_FILES.users);
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Update last login
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex].lastLogin = new Date().toISOString();
    writeJSON(DB_FILES.users, users);

    res.json({ success: true, user });
});

// Submit vote
app.post('/api/votes', (req, res) => {
    const votes = readJSON(DB_FILES.votes);
    const users = readJSON(DB_FILES.users);
    const voteData = req.body;

    // Add vote
    votes.push(voteData);
    writeJSON(DB_FILES.votes, votes);

    // Update user status
    const userIndex = users.findIndex(user => user.username === voteData.username);
    if (userIndex !== -1) {
        users[userIndex].status = 'Sudah Voting';
        users[userIndex].lastLogin = new Date().toISOString();
        writeJSON(DB_FILES.users, users);
    }

    updateStats();
    res.json({ success: true });
});

// Get all votes
app.get('/api/votes', (req, res) => {
    const votes = readJSON(DB_FILES.votes);
    res.json(votes);
});

// Get statistics
app.get('/api/stats', (req, res) => {
    const stats = updateStats();
    res.json(stats);
});

// Clear all votes
app.delete('/api/votes', (req, res) => {
    const users = readJSON(DB_FILES.users);
    
    // Reset all user status
    users.forEach(user => {
        user.status = 'Belum Voting';
        user.lastLogin = null;
    });

    writeJSON(DB_FILES.users, users);
    writeJSON(DB_FILES.votes, []);
    updateStats();

    res.json({ success: true });
});

// Start server
initializeDatabase();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KPU Server berjalan di:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://[YOUR_IP]:${PORT}`);
    console.log(`📊 Database tersimpan di folder ./data/`);
    console.log(`🌐 Akses dari device lain menggunakan IP laptop`);
});
