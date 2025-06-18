-- ========================================
-- KPU MONASMUDA INSTITUTE DATABASE SCHEMA
-- ========================================

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
-- ELECTION STATUS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS election_status (
    id INT PRIMARY KEY DEFAULT 1,
    status ENUM('stopped', 'running', 'ended') DEFAULT 'stopped',
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
-- CANDIDATE PHOTOS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS candidate_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id VARCHAR(20) NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_candidate_active (candidate_id, is_active)
);

-- ========================================
-- INSERT DEFAULT DATA
-- ========================================

-- Insert default election status
INSERT INTO election_status (id, status) VALUES (1, 'stopped')
ON DUPLICATE KEY UPDATE status = status;

-- Insert default candidates
INSERT INTO candidates (id, name, category, position_number, description) VALUES
-- Presiden (NAMA YANG BENAR DARI API)
('presiden1', 'NENENG & INAYAH', 'presiden', 1, 'Membangun institusi yang maju dan demokratis'),
('presiden2', 'AISYAH & EVI', 'presiden', 2, 'Institusi yang inklusif dan berkelanjutan'),

-- PM (NAMA YANG BENAR DARI API)
('pm1', 'KUKUH', 'pm', 1, 'Reformasi birokrasi dan digitalisasi'),
('pm2', 'SAYYIDAH', 'pm', 2, 'Pemberdayaan ekonomi dan sosial'),

-- Parlemen (NAMA YANG BENAR DARI API)
('parlemen1', 'ADINUR KHOLIFAH', 'parlemen', 1, 'Ketua Parlemen Kandidat 1'),
('parlemen2', 'ENI FATMAWATI', 'parlemen', 2, 'Ketua Parlemen Kandidat 2'),
('parlemen3', 'FAIZAH MAULIDA', 'parlemen', 3, 'Ketua Parlemen Kandidat 3'),
('parlemen4', 'AHMAD NASHUKA', 'parlemen', 4, 'Ketua Parlemen Kandidat 4')

ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
updated_at = CURRENT_TIMESTAMP;

-- Insert default users
INSERT INTO users (id, name, username, password, vote_count, verified) VALUES
('001', 'John Doe', 'john.doe', 'password123', 20, FALSE),
('002', 'Jane Smith', 'jane.smith', 'mypass456', 25, FALSE),
('003', 'Ahmad Rahman', 'ahmad.rahman', 'secure789', 15, FALSE),
('004', 'Sari Dewi', 'sari.dewi', 'pass2024', 20, TRUE),
('005', 'Budi Santoso', 'budi.santoso', 'mypassword', 30, TRUE)

ON DUPLICATE KEY UPDATE
name = VALUES(name),
vote_count = VALUES(vote_count),
verified = VALUES(verified),
updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- USEFUL VIEWS
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
-- STORED PROCEDURES
-- ========================================

DELIMITER //

-- Procedure to cast votes
CREATE PROCEDURE CastVote(
    IN p_user_id VARCHAR(10),
    IN p_candidate_id VARCHAR(20),
    IN p_vote_count INT,
    IN p_category VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert or update vote
    INSERT INTO votes (user_id, candidate_id, vote_count, category)
    VALUES (p_user_id, p_candidate_id, p_vote_count, p_category)
    ON DUPLICATE KEY UPDATE
        vote_count = p_vote_count,
        voted_at = CURRENT_TIMESTAMP;

    -- Update user status
    UPDATE users SET
        status = 'Sudah Voting',
        last_login = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    COMMIT;
END //

-- Procedure to reset all votes
CREATE PROCEDURE ResetAllVotes()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    DELETE FROM votes;
    UPDATE users SET status = 'Belum Voting';
    UPDATE election_status SET status = 'stopped', started_at = NULL, ended_at = NULL WHERE id = 1;

    COMMIT;
END //

DELIMITER ;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Additional indexes for better performance
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_verified ON users(verified);
CREATE INDEX idx_candidates_category ON candidates(category);
CREATE INDEX idx_votes_category_candidate ON votes(category, candidate_id);

-- ========================================
-- TRIGGERS
-- ========================================

DELIMITER //

-- Trigger to log user activities
CREATE TRIGGER log_user_login
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.last_login != OLD.last_login THEN
        INSERT INTO activity_log (user_type, user_id, action, details)
        VALUES ('USER', NEW.id, 'LOGIN', CONCAT('User logged in: ', NEW.username));
    END IF;
END //

-- Trigger to log vote casting
CREATE TRIGGER log_vote_cast
AFTER INSERT ON votes
FOR EACH ROW
BEGIN
    INSERT INTO activity_log (user_type, user_id, action, details)
    VALUES ('USER', NEW.user_id, 'VOTE_CAST',
            CONCAT('Vote cast for ', NEW.candidate_id, ' in category ', NEW.category, ' with ', NEW.vote_count, ' votes'));
END //

DELIMITER ;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Create application user (adjust as needed)
-- CREATE USER 'kpu_app'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON kpu_monasmuda.* TO 'kpu_app'@'localhost';
-- FLUSH PRIVILEGES;

-- Show completion message
SELECT 'KPU Monasmuda Database Setup Complete!' as Status;
