-- ========================================
-- CREATE ACTIVITY LOG TABLE
-- For audit logging and activity tracking
-- ========================================

USE kpu_monasmuda;

-- Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    user_id VARCHAR(10) NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_type (user_type),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Insert some sample activity logs for testing
INSERT IGNORE INTO activity_log (user_type, user_id, action, details, ip_address) VALUES
('ADMIN', 'admin', 'LOGIN', 'Admin logged into system', '127.0.0.1'),
('ADMIN', 'admin', 'VIEW_USERS', 'Viewed users list', '127.0.0.1'),
('ADMIN', 'admin', 'START_ELECTION', 'Started election process', '127.0.0.1'),
('USER', '001', 'LOGIN', 'User logged in', '127.0.0.1'),
('USER', '001', 'CAST_VOTE', 'Cast vote for presiden category', '127.0.0.1'),
('ADMIN', 'admin', 'VIEW_RESULTS', 'Viewed election results', '127.0.0.1');

-- Show table structure
DESCRIBE activity_log;

-- Show sample data
SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
