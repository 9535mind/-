-- 동영상 파일 업로드 지원을 위한 컬럼 추가

-- lessons 테이블에 파일 정보 컬럼 추가
ALTER TABLE lessons ADD COLUMN video_file_name TEXT;
ALTER TABLE lessons ADD COLUMN video_file_size INTEGER;
ALTER TABLE lessons ADD COLUMN video_mime_type TEXT;
ALTER TABLE lessons ADD COLUMN video_uploaded_at DATETIME;

-- 주석: video_type 컬럼 사용
-- 'youtube': YouTube 영상 (video_url에 YouTube ID 저장)
-- 'upload': 업로드된 파일 (video_url에 파일 경로 저장)
-- 'url': 외부 URL (video_url에 전체 URL 저장)
