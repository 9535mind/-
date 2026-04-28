# FOREST ZONE — 동결 (JTT-Kinder / 유아숲 / GAS)

**상태:** 완성된 **독립 서비스**. 이 문서는 MS12(회의·`/app`·OAuth 등) 작업과 **경로·코드·환경**이 섞이지 않도록 고정 기준을 적는다.

## 목적

- 정상 작동 중인 **forest(정적 + Worker + GAS + 시트)** 를 저장소·운영 측에서 **명시적으로 분리·보호**한다.
- 이후 **MS12.org 중심 작업**이 forest 를 깨뜨리지 않게 한다.

## FOREST ZONE — 수정 금지(원칙)

아래 **파일·경로·API** 는 **승인·문서·테스트(아래) 없이** 바꾸지 않는다. **리팩터·통합·라우트 공용화 금지.**

### 정적·클라이언스

| 경로 (배포 시 URL) | 비고 |
|-------------------|------|
| `public/forest.html` | JTT-Kinder UI |
| `public/forest-question-banks.js` | 문항·스키마 |
| `public/static/js/jtt-metrics-calculator.js` | 브라우저 점수 계산 (`/static/js/…`로 서빙) |

### Worker·가드 (forest 전용 부분)

| 경로 | 비고 |
|------|------|
| `src/middleware/education-host-guard.ts` | `isForestPathAllowed` / `isForestApiPath` / `isLmsHostForestPath` — **forest.html·`/api/forest*`** 와 1:1 |
| `src/index.tsx` | `serveForestHtmlFromAssets`, `app.route('/api/forest-…')`, `/forest*` HTML 별칭 |
| `src/routes/forest-gas-webhook.ts` | POST → GAS |
| `src/routes/forest-gas-report.ts` | GET 보고서(로그인) |
| `src/routes/forest-gas-report-public.ts` | GET 보고서(공개) |
| `src/routes/forest-results.ts` | D1 집단 결과 |
| `src/utils/forest-admin.ts` | forest 전용 admin 판별( MS12 admin 과 **합치지 말 것** ) |

### GAS(참고 텍스트)

| 경로 | 비고 |
|------|------|
| `scripts/gas-forest-dopost-e-layout-paste.gs` | Live Apps Script 와 **수동 동기**하는 **유일한 텍스트**로 취급 |

## HTTP API (고정, MS12와 **공유하지 않음**)

- `POST /api/forest-gas-webhook` — 시트 GAS `doPost`
- `GET /api/forest-gas-report` — GAS `doGet` (권한)
- `GET /api/forest-gas-report-public` — GAS `doGet` (스냅샷)
- `POST/GET /api/forest-results` — D1

접두 **`/api/forest*`** 는 MS12 `/api/ms12*`, OAuth, 공통 `api` 핸들러에 **흡수·이동 금지.**

## 환경 변수: `FOREST_GAS_WEBHOOK_URL`

- **의미:** Google Apps Script 웹앱 **`…/exec`** URL (GAS v78 등 합의된 배포).
- **원칙:** **값·코드 내 폴백 `FOREST_GAS_WEBHOOK_URL` 상수를 임의로 바꾸지 않는다.**
- **바꾸는 경우(예: 새 GAS 배포):** Cloudflare Pages **Secret/변수** + 레포 `FOREST_GAS_*` **폴백 + `public/forest.html` GET URL** 을 **한 세트**로 갱신하고, **팀 합의·문서** 남기기.
- Unbind 시 Worker 가 사용하는 **폴백**이 곧 “운사과 동의된 URL”이므로 **동일 취급(무단 변경 금지).**

## 유입 검증(배포·변경 시 최소 3가지)

다음 **세 가지를 모두** 통과하면 “forest 정상”으로 본다.

1. **forest 제출 테스트 1회** — `forest.html` 에서 끝까지 제출(또는 동등 `POST` 프록시).
2. **시트 기록 확인** — 행·열이 기대한 탭(예: 2026/2026초등)에 **기록**되는지.
3. **GAS 응답** — (해당 GAS 빌드에 포함된 경우) `POST` 응답 JSON에 `_gasBuild` (예: `41col-2026-04-26`) 가 오는지.

## 금지(명시)

- **MS12와의 통합** (공유 라우트 핸들러, 공통 `api` 네임스페이스에 forest 흡수).
- **라우트 “공용화”** 로 `/api/forest-*` 를 없애거나 이름 변경.
- **불필요한 리팩터** (FOREST ZONE 파일만 “깔끔하게” 하기 위한 광범위 수정).
- **forest 전용** 이 아닌 변경으로 `educationHostGuard` 나 `index.tsx` 의 forest 경로를 **부수적 변경**.

## Cursor / 저장소

- `.cursor/rules/forest-frozen.mdc` — AI·작업자용 요약.
- `README.md` — 본 문서로 링크.

---

*마감(예: mindstory.kr) 이후 **ms12.org** 중심 개발이어도, 위 **FOREST ZONE** 은 별도 정책으로 보호한다.*
