# 쓸모없는 AI서비스 만들기 - AI 옷입히기

## Overview

사용자가 모자, 상의, 하의를 순서대로 자연어 입력해 이미지를 생성하고,  
생성된 의상 이미지를 사람 실루엣 위에 직접 드래그해 배치하는 AI 패션 심사 서비스입니다.

최종 점수는 실루엣 적합도와 엄마 AI 평가를 합산해 계산합니다.

- 실루엣 점수: 30점
- AI 평가 점수: 70점
- 총점: 100점

엄마의 잔소리에 주눅들지 말고,  
당신의 스타일을 당당하게 표현하세요.
‘틀린 패션’은 없습니다.

---

## 예상 트래픽

- 예상 사용자 50명
- DB 사용량: 이미지 인당 10장


## Tech Stack

Fullstack: Next.js
Runtime: Node.js
AI Image Generation: Imagen (Gemini API)  
AI Evaluation: Gemini API (text generation)  
DB: SQLite  
Image Storage: Compute Engine 로컬 디스크 (/public/uploads)  
Infra: GCP Compute Engine 1대  
Process: PM2

---

## AI Models

### Image Generation

- Model: Imagen (via Gemini API)  
- 방식: 텍스트 프롬프트 기반 이미지 생성  

### Evaluation

- 규칙 기반 점수: 이미지가 얼마나 틀에 맞는지
- Model: Gemini Text Model  
- 역할: 엄마 AI 페르소나 기반 평가 생성  
- 1차 구현에서는 모자/상의/하의 프롬프트와 실루엣 점수 계산 결과를 입력으로 사용한다
- 합성 이미지를 Gemini에 함께 전달할지 여부는 실제 API 응답 형식을 확인한 뒤 결정한다

### Scoring

최종 점수는 total_score 하나만 사용합니다.

점수는 내부적으로 다음 기준으로 계산됩니다.

- 실루엣 적합도: 30%
- 엄마 AI 평가: 70%

total_score = silhouette_score + mom_ai_score

단, silhouette_score와 mom_ai_score는 내부 계산에만 사용되며
DB 및 API에서는 total_score만 사용합니다.

### Silhouette Score Rule

실루엣 적합도는 UI에 표시된 파트별 기준 영역을 얼마나 잘 채웠는지와,
기준 영역 밖으로 얼마나 벗어났는지를 기준으로 계산합니다.

- 기준 영역은 모자, 상의, 하의 3개로 고정한다
- 사용자는 각 파트 이미지를 드래그해 해당 영역에 배치한다
- 기준 영역 안을 많이 채울수록 가산한다
- 기준 영역 밖으로 벗어날수록 감점한다
- 모자, 상의, 하의는 각각 10점 만점이며 총 30점 만점이다

기준 영역은 실루엣 캔버스 전체를 기준으로 비율 좌표로 정의한다.
예시: 
- hat_box = { x: 0.25, y: 0.08, width: 0.50, height: 0.12 }
- top_box = { x: 0.20, y: 0.20, width: 0.60, height: 0.30 }
- bottom_box = { x: 0.20, y: 0.50, width: 0.60, height: 0.40 }

각 파트 점수 계산 개념:

- fill_ratio = 기준 영역 안에 들어간 면적 / 기준 영역 면적
- overflow_ratio = 기준 영역 밖으로 벗어난 면적 / 기준 영역 면적
- part_score = max(0, min(10, round((fill_ratio * 12) - (overflow_ratio * 8))))

최종 실루엣 점수:

- silhouette_score = hat_score + top_score + bottom_score

좌표와 크기는 사용자가 배치한 이미지 박스를 기준으로 계산한다.

---

## Outfit Generation

사용자는 아래 순서대로 3개의 의상 파트를 생성합니다.

1. 모자
2. 상의
3. 하의

각 단계에서 사용자는 자연어로 원하는 스타일을 입력합니다.  
시스템은 각 파트별 사전 템플릿을 프롬프트에 추가해 이미지 생성 API에 전달합니다.

### Prompt Template

#### 모자

사용자 입력:
{user_prompt}

사전 템플릿:
- only one hat item
- transparent background
- front view
- centered object
- no mannequin
- no human body
- no text
- no logo
- clean product image style
- transparent background와 centered object는 프롬프트로 유도만 하며 결과를 보장하지 않는다

#### 상의

사용자 입력:
{user_prompt}

사전 템플릿:
- only one upper-body clothing item
- transparent background
- front view
- centered object
- no mannequin
- no human body
- no text
- no logo
- clean product image style
- transparent background와 centered object는 프롬프트로 유도만 하며 결과를 보장하지 않는다

#### 하의

사용자 입력:
{user_prompt}

사전 템플릿:
- only one lower-body clothing item
- transparent background
- front view
- centered object
- no mannequin
- no human body
- no text
- no logo
- clean product image style
- transparent background와 centered object는 프롬프트로 유도만 하며 결과를 보장하지 않는다

---

## Project Structure

.
├── app/                # Next.js pages  
├── app/api/            # API routes  
├── public/uploads/     # generated images  
├── db.sqlite           # SQLite DB  
└── lib/                # Gemini API logic  

---

## Database Schema

```sql
CREATE TABLE outfits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hat_prompt TEXT NOT NULL,
  top_prompt TEXT NOT NULL,
  bottom_prompt TEXT NOT NULL,
  composed_img_url TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  popular_score INTEGER DEFAULT 0,
  mom_review TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Image Storage

/public/uploads/{uuid}.png  

- 서버에는 최종 합성 이미지 1장만 로컬 디스크에 저장  
- 생성된 모자/상의/하의 이미지는 서버에 저장하지 않음
- 생성된 파트 이미지는 사용자 세션 범위의 클라이언트 상태에서만 유지
- DB에는 최종 합성 이미지 URL만 저장  

composed_img_url = /uploads/{uuid}.png

---

## Persona: 엄마 AI

이름: 김정숙 여사  
나이: 50대  
성격: 직설적, 걱정 많음, 편향된 기준  

### 핵심 가치관

“옷은 튀려고 입는 게 아니라, 남들 보기 편하게 입는 거다.”

### 평가 기준

1. 단정함  
2. 노출 최소화  
3. 색 조합 안정성  
4. 실용성  
5. 타인 시선  

### 편향 규칙

감점:  
- 노출 많음  
- 튀는 색  
- 브랜드 과시  
- 유행 스타일  

가산:  
- 무채색  
- 헐렁한 옷  
- 꽃/자연 요소  
- 가디건  

### 말투

- “엄마가 보기엔…”  
- “굳이 이렇게까지 해야 되니?”  
- “남들 눈은 생각 안 해봤어?”  

---

## Output Format

[엄마 평가]

1. 전체 총평:

2. 상세 평가:
- 모자:
- 상의:
- 하의:

3. 잔소리:

4. 점수:
- 총점: 0 ~ 100
- 이유

---

## Example Output

[엄마 평가]

1. 전체 총평:
전체적으로 너무 튀고 정신이 없다.

2. 상세 평가:
- 모자: 너무 크다. 어울리지 않는다.
- 상의: 짧아서 보기 불편하다. 
- 하의: 색이 튄다. 과하다.

3. 잔소리:
엄마가 보기엔 이건 너무 과하다.
그냥 무난하게 입으면 안 되니?

4. 점수:
총점: 14점  
이유: 노출 + 색상 과다 + 조화 부족  

---

## Pages

### 1. 옷입히기 페이지

- 사람 실루엣 표시
- 사용자는 순서대로 모자, 상의, 하의를 자연어로 입력
- 각 입력마다 해당 의상 파트 이미지 생성
- 생성된 이미지는 클라이언트 상태에 유지되며 사용자가 직접 드래그해 실루엣 위에 배치
- 배치 완료 후 패션 대회 참가

구성:
- 모자 생성
- 상의 생성
- 하의 생성
- 드래그 앤 드롭 배치
- 실루엣 기준 영역 채움/이탈 기반 적합도 계산

CTA: 패션 대회 참가

---

### 2. 평가 페이지

- 총점 출력 (0 ~ 100)
- 엄마 AI 평가 출력

CTA:  
- 리더보드 이동  

---

### 3. 리더보드

정렬:
- total 점수 순  
- 인기 점수 순  

UI:
- 1행 2개 카드  
- 한 화면에 총 4개가 표시
- 좌, 우 버튼으로 다음 4개 표시하는 구조 
- 패션 카드 클릭 시 패션 디테일 페이지로 이동

카드:
- 이미지 90%
- total 점수 좌하단 4%
- 인기 점수 우하단 4%
- 👍 버튼  인기점수 우측에 2%

### 4. 패션 디테일 페이지

리더보드에서 패션 카드를 클릭하면 이동하는 상세 페이지입니다.

표시 정보:

- 합성된 코디 이미지
- 모자 생성 프롬프트
- 상의 생성 프롬프트
- 하의 생성 프롬프트
- 엄마 AI 평가 내용
- 토탈 점수
- 인기 점수
- 👍 버튼

CTA:

- 리더보드로 돌아가기

---

## Flow

모자 자연어 입력
→ 모자 Imagen 이미지 생성
→ 상의 자연어 입력
→ 상의 Imagen 이미지 생성
→ 하의 자연어 입력
→ 하의 Imagen 이미지 생성
→ 생성된 파트 이미지는 클라이언트 상태에만 유지
→ 사용자가 각 이미지를 실루엣 위에 드래그 배치
→ 최종 점수 계산
→ 최종 제출 시 서버가 합성 이미지 1장만 로컬 저장 (/uploads)
→ 점수, 이미지 url SQLite 저장
→ 리더보드 출력
→ 패션 카드 클릭
→ 패션 디테일 조회
→ 프롬프트 / mom_review / total 점수 / 인기 점수 표시

---

## API

POST /api/generate/hat
- 모자 prompt 입력
- 사전 템플릿 추가
- 모자 이미지 생성
- 생성 이미지를 클라이언트에 반환

POST /api/generate/top
- 상의 prompt 입력
- 사전 템플릿 추가
- 상의 이미지 생성
- 생성 이미지를 클라이언트에 반환

POST /api/generate/bottom
- 하의 prompt 입력
- 사전 템플릿 추가
- 하의 이미지 생성
- 생성 이미지를 클라이언트에 반환

POST /api/outfits
- 모자/상의/하의 생성 이미지 입력
- 모자/상의/하의 프롬프트 입력
- 사용자가 배치한 좌표/크기 입력
- 합성 이미지 생성
- 실루엣 기준 영역 대비 채움 비율/이탈 비율로 실루엣 점수 계산
- 1차 구현에서는 모자/상의/하의 프롬프트와 실루엣 점수 계산 결과를 기반으로 엄마 AI 평가 생성
- 합성 이미지를 Gemini 입력에 포함할지는 실제 API 응답 확인 후 결정
- 최종 점수 계산
- 최종 합성 이미지 1장만 서버 로컬 저장
- DB 저장

GET /api/outfits/:id
- 최종 합성 이미지 
- 모자/상의/하의 프롬프트
- mom_review 
- total 점수 조회
- 인기 점수 조회

GET /api/leaderboard?sort=total
- total_score 기준 정렬

GET /api/leaderboard?sort=popular
- 인기 점수 기준 정렬

POST /api/outfits/:id/upvote
- popular_score 증가
- 증가된 popular_score 반환

---

## Upvote Policy

- 인증 기능은 구현하지 않는다
- 업보트는 브라우저 단위로만 제한한다
- 같은 브라우저에서는 같은 outfit id에 대해 1회만 업보트 가능하다
- 중복 업보트 여부는 클라이언트 저장소(localStorage 또는 sessionStorage) 기준으로 처리한다
- 브라우저를 바꾸거나 저장소를 지우면 다시 업보트할 수 있다
- 서버는 요청이 오면 popular_score를 1 증가시킨다

---

## Core Message

엄마의 잔소리에 주눅들지 말고,  
당신의 스타일을 당당하게 표현하세요.

이 서비스는 ‘틀린 패션’이 아니라  
‘다른 기준의 평가’가 존재할 뿐이라는 점을 보여줍니다.  

---

## Instructions
- 이 프로젝트는 MVP 기준으로 구현한다. (과도한 구조 분리 금지)
- 명시되지 않은 기능은 추가하지 않는다.
- DB 스키마는 README에 정의된 그대로 사용한다. (컬럼 추가 금지)
- 점수는 total_score 하나만 사용한다.
- composed_img_url만 이미지로 사용한다.
- API는 README에 정의된 것만 구현한다.
- 프론트/백엔드는 Next.js 하나로 구현한다.
- 스타일링은 단순하게 구현한다 (Tailwind 또는 기본 CSS)
- 에러 처리, 인증, 최적화는 최소한으로 구현한다
- 테스트 코드 작성하지 않는다
- Gemini API의 실제 응답 형식은 먼저 구현 후 확인하고, 필요한 후속 대응은 그 결과를 보고 정한다

---


## Run

```bash
npm install
npm run build
npm start
