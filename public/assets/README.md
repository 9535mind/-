# 4STT 대문 인트로 영상

메인 대시보드(`forest.html`)의 숏츠 비주얼에 사용하는 **로컬 MP4**를 이 폴더에 두면 됩니다.

## Cloudflare Pages 한도 (중요)

**단일 파일당 최대 25 MiB**입니다. 그보다 크면 배포 시 해당 파일이 **업로드되지 않아** 프로덕션에서 **`/assets/forest_test.mp4` 가 404**가 됩니다. `npm run build` 끝에 경고가 나오면 아래처럼 줄이세요.

```bash
# 예: 무음·세로 루프용으로 재인코딩 (크기에 맞게 -crf 조정)
ffmpeg -i forest_test.mp4 -an -c:v libx264 -pix_fmt yuv420p -crf 26 -movflags +faststart forest_test_small.mp4
move /Y forest_test_small.mp4 forest_test.mp4
```

25 MiB를 넘기면 안 되는 경우 **R2 공개 버킷·다른 CDN**에 MP4를 올리고, 앱 **관리자 → 대문 비주얼**에서 그 **HTTPS URL**을 넣어도 됩니다.

## 파일

| 파일 | 설명 |
|------|------|
| `forest_test.mp4` | 무음·루프 재생용 짧은 영상(권장: 9:16 세로, 수 초~30초). **25 MiB 이하** 권장. 없으면 포스터 이미지(Unsplash 기본값 또는 관리자에서 지정한 URL)만 표시됩니다. |
| `KakaoTalk_20240501_163910442.mp4`, `KakaoTalk_20240501_172743992.mp4` | (선택) 대시보드 인트로 **릴레이** 2편. 이 이름으로 `public/assets/`에 넣으면 순환 재생. 없으면 `forest_test.mp4`만 사용. **사이트 루트(`/KakaoTalk…`)에는 두지 마세요** — 배포 경로는 `/assets/`만 시도합니다. |

프로덕션에서 **`https://(도메인)/assets/forest_test.mp4`** 가 열려야 합니다. `npm run build` 시 `public/assets/` 전체가 `dist/assets/`로 복사됩니다. 파일이 없거나 한도 초과면 404가 나고, 앱은 포스터 이미지로만 대문을 채웁니다.

## 관리자에서 URL 변경

관리자 인증 후 **관리 대시보드**를 펼치면 **대문 비주얼 (숏츠)**에서 영상·포스터 URL을 이 기기 `localStorage`에 저장할 수 있습니다. Pexels 등 외부 HTTPS MP4 URL을 넣어도 됩니다.
