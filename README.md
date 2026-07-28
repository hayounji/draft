# SNS 장소 위시리스트 CLI

공개 SNS 또는 웹 링크 하나를 받아, 로그인 없는 공개 메타데이터·지도 URL·@멘션을 먼저 확인하고 부족한 경우 AI가 장소명·지역·분류·메뉴/테마 키워드(예: `팬케이크`, `성수동`)를 추출합니다. API 키 없이도 모든 후보는 `검토 필요`로 만들어 사람이 확인한 뒤 Notion DB에 저장합니다. 네이버지도 관심장소 저장은 이미 로그인된 **로컬 Chrome 프로필**을 Playwright로 열며, 명시적 승인 없이는 실행되지 않습니다.

이 도구는 비공개 SNS·로그인 우회·무단 크롤링을 하지 않습니다. SNS URL과 사용자가 제공한 보조 텍스트/추출 JSON만 입력으로 사용하며, SNS·네이버 비밀번호를 저장하거나 입력받지 않습니다.

## 설치와 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env
npm test
npm run typecheck
npm run place -- extract "https://www.instagram.com/p/POST_ID/" --out places.json
npm run place -- validate places.json
npm run place -- create-notion examples/places.json
npm run place -- save-naver examples/places.json --confirm
```

`extract`에는 `GEMINI_API_KEY`가 필요합니다. Gemini URL Context와 Google Search를 이용해 사용자가 제출한 URL의 로그인 없는 공개 정보만 읽도록 요청하며, 모든 결과는 자동 저장하지 않고 `검토 필요`로 남습니다. 장소를 확인한 뒤 JSON의 `status`를 `검증 완료 · 지도 저장 대기`로 변경해야 `save-naver --confirm`으로 넘길 수 있습니다. 비공개·로그인 요구·차단 페이지는 우회하지 않습니다. Gemini API 무료 티어에는 호출 한도가 있습니다. `NAVER_USER_DATA_DIR`에는 이미 네이버에 로그인한 전용 로컬 Chrome 프로필의 절대 경로를 넣으세요. 비밀번호·API 키·프로필 경로가 담긴 `.env`는 Git에 커밋하지 마세요.

## GitHub에서 실행하기

GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 `GEMINI_API_KEY`를 추가합니다. 그다음 **Actions → Extract SNS places → Run workflow**를 열고 `sns_url`에 공개 SNS 링크를 붙여 넣어 실행합니다. 완료된 실행 화면의 **Artifacts**에서 `places-json`을 내려받으면 추출된 `places.json`을 받을 수 있습니다. API 키는 Actions 로그나 소스 코드에 표시되지 않습니다.

## 입력 JSON

최상위 배열 또는 `{ "places": [...] }` 형식을 지원합니다.

```json
[
  {
    "name": "예시 카페",
    "sourceUrl": "https://www.instagram.com/p/example/",
    "region": "서울 성수동",
    "majorCategory": "음식",
    "primaryCategory": "카페",
    "secondaryCategory": "커피",
    "alcoholTags": [],
    "status": "검증 완료 · 지도 저장 대기"
  }
]
```

`extract`가 만든 JSON에는 `keywords`와 `confidence`도 포함됩니다. `notionPageId`를 각 항목에 넣으면 `save-naver` 결과 상태를 해당 Notion 페이지에도 반영합니다. 검색 결과가 여러 개이거나 저장 버튼을 안전하게 특정할 수 없으면 자동 저장하지 않고 `검토 필요`로 처리합니다.

## Notion DB 설정

1. Notion에서 데이터베이스를 만들고 integration에 페이지를 공유합니다.
2. integration token을 `NOTION_API_KEY`, 데이터베이스 ID를 `NOTION_DATABASE_ID`에 설정합니다.
3. 아래 속성 이름과 형식을 정확히 만듭니다.

| 속성 | 형식 |
| --- | --- |
| Name | Title |
| 원본 링크, 지도 링크 | URL |
| 대분류, 1차 카테고리, 2차 카테고리, 상태 | Select |
| 주류 태그, 키워드 | Multi-select |
| 추천 별점 | Number |
| 추천 이유, 후기 | Rich text |
| 방문 여부 | Checkbox |

상태 옵션은 `검증 완료 · 지도 저장 대기`, `지도 저장 완료`, `검토 필요`를 추가합니다. 분류 옵션은 프로젝트의 `src/domain/place.ts`에 정의된 값과 같아야 합니다.
