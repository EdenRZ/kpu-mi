-- ========================================
-- KPU MONASMUDA INSTITUTE - COMPLETE DATABASE SETUP
-- ========================================
-- This file sets up the complete database with sample data
-- Run this file to get a fully functional voting system

-- Create database
CREATE DATABASE IF NOT EXISTS kpu_monasmuda;
USE kpu_monasmuda;

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    vote_count INT DEFAULT 20,
    status ENUM('Belum Voting', 'Sudah Voting') DEFAULT 'Belum Voting',
    verified BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- CANDIDATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('presiden', 'pm', 'parlemen') NOT NULL,
    position_number INT NOT NULL,
    photo_url LONGTEXT DEFAULT 'kandidat/kpulogo.jpg',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- VOTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL,
    candidate_id VARCHAR(20) NOT NULL,
    vote_count INT NOT NULL DEFAULT 1,
    category ENUM('presiden', 'pm', 'parlemen') NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_user_category (user_id, category),
    INDEX idx_candidate (candidate_id),
    INDEX idx_voted_at (voted_at)
);

-- ========================================
-- ACTIVITY LOG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type ENUM('ADMIN', 'USER') NOT NULL,
    user_id VARCHAR(10),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_type (user_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- ========================================
-- ADMIN USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- ELECTION SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS election_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================
-- INSERT SAMPLE DATA
-- ========================================

-- Insert default admin user (username: admin, password: admin123)
INSERT IGNORE INTO admin_users (id, username, password, name, role) VALUES
('admin001', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'SUPER_ADMIN');

-- Insert sample candidates
INSERT IGNORE INTO candidates (id, name, category, position_number, description) VALUES
-- Presiden & Wakil Presiden
('presiden1', 'NENENG & INAYAH', 'presiden', 1, 'Pasangan calon Presiden dan Wakil Presiden nomor 1'),
('presiden2', 'AISYAH & EVI', 'presiden', 2, 'Pasangan calon Presiden dan Wakil Presiden nomor 2'),

-- Perdana Menteri
('pm1', 'KUKUH', 'pm', 1, 'Calon Perdana Menteri nomor 1'),
('pm2', 'SAYYIDAH', 'pm', 2, 'Calon Perdana Menteri nomor 2'),

-- Ketua Parlemen
('parlemen1', 'ADINUR KHOLIFAH', 'parlemen', 1, 'Calon Ketua Parlemen nomor 1'),
('parlemen2', 'ENI FATMAWATI', 'parlemen', 2, 'Calon Ketua Parlemen nomor 2'),
('parlemen3', 'FAIZAH MAULIDA', 'parlemen', 3, 'Calon Ketua Parlemen nomor 3'),
('parlemen4', 'AHMAD NASHUKA', 'parlemen', 4, 'Calon Ketua Parlemen nomor 4');

-- Insert sample users
INSERT IGNORE INTO users (id, name, username, password, verified) VALUES
('001', 'Ahmad Fauzi', 'ahmad001', 'password123', TRUE),
('002', 'Siti Nurhaliza', 'siti002', 'password123', TRUE),
('003', 'Budi Santoso', 'budi003', 'password123', TRUE),
('004', 'Dewi Sartika', 'dewi004', 'password123', TRUE),
('005', 'Rizki Pratama', 'rizki005', 'password123', TRUE);

-- Insert election settings
INSERT IGNORE INTO election_settings (setting_key, setting_value, description) VALUES
('election_status', 'active', 'Status pemilihan: active, inactive, completed'),
('voting_start_time', '2025-01-01 08:00:00', 'Waktu mulai pemilihan'),
('voting_end_time', '2025-12-31 17:00:00', 'Waktu berakhir pemilihan'),
('votes_per_category', '20', 'Jumlah suara per kategori untuk setiap pemilih'),
('allow_vote_changes', 'true', 'Apakah pemilih boleh mengubah pilihan'),
('show_results_realtime', 'true', 'Tampilkan hasil secara real-time');

-- ========================================
-- CREATE VIEWS
-- ========================================

-- Vote summary view
CREATE OR REPLACE VIEW vote_summary AS
SELECT
    c.id as candidate_id,
    c.name as candidate_name,
    c.category,
    c.position_number,
    COALESCE(SUM(v.vote_count), 0) as total_votes,
    COUNT(DISTINCT v.user_id) as unique_voters
FROM candidates c
LEFT JOIN votes v ON c.id = v.candidate_id
GROUP BY c.id, c.name, c.category, c.position_number
ORDER BY c.category, c.position_number;

-- User voting status view
CREATE OR REPLACE VIEW user_voting_status AS
SELECT
    u.id,
    u.name,
    u.username,
    u.vote_count as allocated_votes,
    u.status,
    u.verified,
    COALESCE(SUM(CASE WHEN v.category = 'presiden' THEN v.vote_count ELSE 0 END), 0) as presiden_votes,
    COALESCE(SUM(CASE WHEN v.category = 'pm' THEN v.vote_count ELSE 0 END), 0) as pm_votes,
    COALESCE(SUM(CASE WHEN v.category = 'parlemen' THEN v.vote_count ELSE 0 END), 0) as parlemen_votes,
    COALESCE(SUM(v.vote_count), 0) as total_votes_cast
FROM users u
LEFT JOIN votes v ON u.id = v.user_id
GROUP BY u.id, u.name, u.username, u.vote_count, u.status, u.verified;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'Database setup completed successfully!' as Status,
       'You can now use the voting system' as Message,
       'Default admin: username=admin, password=admin123' as AdminLogin;
