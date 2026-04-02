#!/bin/bash
# 빌드 후 처리 스크립트 - uploads 폴더와 _routes.json 자동 복사

echo "📁 uploads 폴더 복사 중..."
if [ -d "public/uploads" ]; then
  cp -r public/uploads dist/
  echo "✅ uploads 폴더 복사 완료"
else
  echo "⚠️  public/uploads 폴더가 없습니다"
fi

echo "📝 _routes.json 생성 중..."
# exclude: Worker 우회 정적 경로(실제 public 파일). Clean URL 리다이렉트와 무관.
cat > dist/_routes.json << 'ROUTES'
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/uploads/*", "/static/*", "/pg-business-info.html", "/mindstory-4gunja-temperament.html", "/forest.html", "/google7186e759c88da5d4.html"]
}
ROUTES
echo "✅ _routes.json 생성 완료"

echo "✨ 빌드 완료!"
