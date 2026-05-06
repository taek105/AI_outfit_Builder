# AI 옷입히기

## .env.local 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
GEMINI_API_KEY=your_gemini_text_api_key
GEMINI_IMAGE_API_KEY=your_gemini_image_api_key
GEMINI_TEXT_MODEL=gemini-2.0-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

- `GEMINI_API_KEY`: LLM 평가 텍스트 생성에 사용합니다.
- `GEMINI_IMAGE_API_KEY`: LLM 이미지 생성에 사용합니다.
  - 두 API 키를 같은 Gemini 키로 써도 됩니다
  - `GEMINI_IMAGE_API_KEY`가 없으면 이미지 생성은 mock 이미지로 동작합니다.

## 의존성 버전

| 패키지 | 버전 |
| --- | --- |
| Next.js | `15.3.8` |
| React | `19.1.0` |
| React DOM | `19.1.0` |
| sharp | `^0.34.1` |

## 서비스 아키텍처

```mermaid
flowchart LR
  User[사용자] --> Next[Next.js App]
  Next --> ImageAPI[Gemini Image API]
  Next --> TextAPI[Gemini Text API]
  Next --> Uploads[Git에 포함된 public/uploads 이미지]

  ImageAPI --> Next
  TextAPI --> Next
  Uploads --> Next
```

## Vercel 배포 메모

- 루트 경로(`/`)는 `/main`으로 이동합니다.
- 리더보드는 `public/uploads`에 Git으로 커밋된 이미지 파일을 읽어 표시합니다.
- 추천 버튼은 브라우저 `localStorage`에 저장되며 서버 DB에는 누적하지 않습니다.
- `/api/outfits` POST 업로드 저장 기능은 정적 Vercel 호스팅용으로 비활성화되어 있습니다.
