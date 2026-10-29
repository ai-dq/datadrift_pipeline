# Q-OCR 화면 구성 적용

참조 저장소: `/home/hslim/Code/OCR/Q-OCR/repos/Q-OCR-dashboard`.

| 참조 코드 (`src/` 기준) | DataDrift 적용 |
| --- | --- |
| `components/layout/app-sidebar/site-header.tsx`, `app-sidebar.tsx`, `nav-main.tsx` | 화면 전체 상단 헤더, 그 아래 사이드바, 그룹 아이콘과 들여쓴 하위 메뉴, 접기 |
| `components/ui/page-header.tsx` | 제목·설명 왼쪽, 화면의 주요 동작 오른쪽 |
| `components/features/workspaces/workspace-list-toolbar.tsx`, `workspace-card.tsx` | 검색·상태·정렬 한 줄, 이름·모델·진행률 카드 |
| `app/[lang]/(protected)/models/data-table.tsx`, `components/features/models/model-list-toolbar.tsx` | 검색·유형 필터, 요약 카드 없는 모델 표 |
| `components/features/training/HorizontalSelectionFlow.tsx`, `selection/SelectionCard.tsx` | 외곽 패널 없는 3열 선택 영역, 번호·아이콘·설명 헤더, 제목 옆 설정·시작 버튼 |
| `app/[lang]/(protected)/models/default/components/default-models-page-v1.tsx` | API 선택 카드와 아래 상세·테스트 영역 |

DataDrift 데이터/API 계약에 맞춰 컴포넌트를 이식했다. 레이블 진행률은 사람 검토율이 아닌 `labeled_count / count`이며, 레이블 모델은 데이터셋의 `labeling_model_id`로 표시한다. Q-OCR 전용 OCR 작업 유형·버전 관리·사용자 계정 기능은 존재하는 것처럼 표시하지 않는다. 기존 화면 선호에 따라 장식용 아이콘 배경과 그림자는 생략한다.
