-- Password reset enforcement flag for admin-issued temporary passwords
ALTER TABLE users ADD COLUMN password_reset_required INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_required
ON users(password_reset_required);
