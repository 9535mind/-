-- 소셜 로그인 중복 계정 방지
-- (social_provider, social_id) 조합을 유니크하게 설정
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_social_provider_id
ON users(social_provider, social_id)
WHERE social_provider IS NOT NULL AND social_id IS NOT NULL;
