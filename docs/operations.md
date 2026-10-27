# 실행 및 운영

## 구성

- UI: Next.js, `http://121.126.210.3:18091/ko/workspaces`
- API: FastAPI, loopback `127.0.0.1:18092` (UI의 `/api/*`로 프록시)
- API 문서: 서버에서 `http://127.0.0.1:18092/docs`
- 저장소: `.runtime/catalog.sqlite`, SQLite WAL; 단일 호스트/단일 워커 구성
- GPU: 기존 전용 Python 환경 `/data/hslim/venvs/gemma4-12b-transformers-dev/bin/python`
- 기본 모델: `/data/hslim/models/Qwen3.5-2B`, `/data/hslim/models/Qwen3.5-4B`
- 모델·로그·입력 스냅샷: `.runtime/jobs/<job-id>/`
- 로그인 없음. 기존 내부망 접근 범위에서 운영하며 방화벽이나 외부 공개 설정은 변경하지 않습니다.

## 설치

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
DATADRIFT_INPUT_ROOT=/home/hslim/Code/datadrift .venv/bin/python -m backend.catalog
npm run build
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/
```

GPU 환경은 별도입니다. 현재 검증 환경은 torch 2.10.0+cu128,
transformers 5.18.0.dev0, peft 0.20.0이며 Qwen3_5ForConditionalGeneration을 지원해야 합니다.
기존 GPU 환경을 변경하지 않습니다. 모델은 로컬 파일만 읽습니다.
서비스 파일의 작업 경로·실행 파일·포트·환경변수를 환경에 맞춰 확인한 뒤 설치합니다.

```sh
cp deploy/datadrift-pipeline-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now datadrift-pipeline-api datadrift-pipeline-worker datadrift-pipeline-web
```

`DATADRIFT_STATE`, `DATADRIFT_INPUT_ROOT`, `DATADRIFT_MODELS`,
`DATADRIFT_TRAIN_PYTHON`, `DATADRIFT_GPU`, `DATADRIFT_PUBLIC_ORIGIN`으로 경로와 실행 환경을 지정합니다.
프록시를 통한 브라우저 쓰기 요청은 `DATADRIFT_PUBLIC_ORIGIN`과 일치해야 합니다.
CLI 요청은 Origin 없이 내부 API에 접근합니다.

## 서비스 유지·관찰

```sh
systemctl --user status datadrift-pipeline-api datadrift-pipeline-worker datadrift-pipeline-web
journalctl --user -u datadrift-pipeline-api -u datadrift-pipeline-worker -u datadrift-pipeline-web -f
systemctl --user restart datadrift-pipeline-web
curl -f http://121.126.210.3:18091/api/health
loginctl show-user "$USER" -p Linger
```

API/UI 재시작은 실행 중인 워커 학습을 끊지 않습니다. 워커 재시작은 실행 중 작업과
해당 자식 프로세스를 종료합니다. 재시작 시 그 작업은 실패로 표시되며, 부분 산출물을
보존합니다. 사용자가 새 작업을 등록해야 합니다. 실행 중 모델 학습의 자동 이어하기는 제공하지 않습니다.
서비스의 Restart=always와 사용자 linger로 로그인 세션과 독립적으로 실행합니다.

## 데이터와 평가 해석

무신사 1,000개는 Codex의 시각 검토 레이블, GS SHOP 651개는 Gemma4의 의사 레이블입니다.
둘 다 사람 검증 정답이 아닙니다. 원본 SHA256, 출처, 기존 train/validation/test 분할,
평가 제외 속성을 보존합니다. 원본 이미지와 레이블 파일을 Git에 올리지 않습니다.
무신사 700/100/200, GS SHOP 490/81/80 분할을 사용합니다.
가져오기는 전체 검증 후 원자적으로 저장하며 동일 내용의 재실행은 중복 생성하지 않습니다.

재구성은 학습 분할만 변경하고 검증/테스트는 원본 그대로 보존합니다.
출처 균형 또는 고정 시드 무작위 선별을 지원하며 각 결과를 불변 데이터셋으로 저장합니다.
레이블 내보내기는 이미지 경로를 제외한 JSONL이며 이미지 파일 자체는 원본 저장소에 남습니다.

학습은 배치 1, SFT+LoRA rank/alpha 8, BF16, 언어 attention 레이어만 갱신합니다.
unknown과 평가 제외 속성 값은 손실에서 마스킹합니다. 학습 스텝 수는 전체 에포크 수와 다릅니다.
성공한 학습은 레지스트리에 새 어댑터 모델로 등록됩니다.
평가는 검증/테스트 분할에서 생성한 JSON과 AI 레이블의 일치도를 측정하며 파싱 실패도 오답으로 계산합니다.
2스텝/소수 샘플 검증은 작동 확인이며 모델 품질 검증이나 전체 학습을 의미하지 않습니다.

드리프트는 14개 레이블 속성의 Jensen–Shannon divergence (base 2, 0~1)와
이미지 RGB 히스토그램 JS를 계산합니다. 소스/도메인 차이이며 시간 순서 드리프트,
성능 저하, 통계적 유의성, 임베딩 기반 검출을 주장하지 않습니다.
GS SHOP과 무신사의 레이블 생성 방식 차이도 분포 결과에 영향을 줍니다.

## 검증

```sh
.venv/bin/python -m pytest -q
npm run typecheck
npm run build
```

데이터 상태를 복구할 때는 API/워커를 명시적으로 중지하고 SQLite 온라인 백업 또는
WAL을 포함한 일관된 스냅샷과 `.runtime/jobs`를 함께 보관합니다.
이 프로젝트는 다중 호스트 작업 스케줄러, SSO, 오브젝트 스토리지 배포를 포함하지 않습니다.
