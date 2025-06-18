-- ========================================
-- UPDATE PHOTO_URL FIELD FOR DATA URL SUPPORT
-- ========================================

USE kpu_monasmuda;

-- Backup existing photo_url data before modification
CREATE TABLE IF NOT EXISTS candidates_photo_backup AS
SELECT id, photo_url, updated_at 
FROM candidates 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Modify photo_url field to support large data URLs
ALTER TABLE candidates 
MODIFY COLUMN photo_url LONGTEXT DEFAULT 'kandidat/kpulogo.jpg';

-- Also update candidate_photos table if it exists
ALTER TABLE candidate_photos 
MODIFY COLUMN photo_url LONGTEXT NOT NULL;

-- Show completion message
SELECT 'Photo URL field updated to support data URLs!' as Status;

-- Show current table structure
DESCRIBE candidates;
