# 모델 API

`/ko/model-api`에서 기본 Qwen3.5 모델이나 비케이브 기준으로 학습한 LoRA 모델을 등록합니다. API마다 선택한 모델 ID를 고정합니다. 모델 파일이 없거나 보관된 모델은 등록할 수 없습니다.

이미지 접수와 결과 조회를 분리한 비동기 API입니다. 기존 학습 워커가 GPU 0에서 등록 순서대로 처리합니다. 별도의 GPU 서버나 포트는 추가하지 않습니다. 요청마다 모델을 불러오기 때문에 대기 시간과 모델 로딩 시간이 발생합니다. 짧은 지연 시간이 필요한 상시 추론 서버는 별도 구현 대상입니다.

## 사용 방법

1. 화면에서 `API 등록`을 누르고 이름과 모델을 선택합니다.
2. 등록된 API를 선택하고 해당 API의 요청 주소로 이미지 한 장을 보냅니다. 상품 카테고리는 이미지에서 자동 판별합니다.
3. HTTP 202 응답에 담긴 `result_url`을 조회합니다.
4. `status`가 `succeeded`이면 `result`를 읽습니다. `failed`, `cancelled`도 종료 상태입니다.

```sh
# ENDPOINT_ID는 모델 API 페이지의 요청 주소에서 확인합니다.
curl -X POST 'http://121.126.210.3:18091/api/model-endpoints/ENDPOINT_ID/predictions' \
  -F 'file=@product.jpg'

# 위 응답에 포함된 result_url로 조회합니다.
curl 'http://121.126.210.3:18091/api/predictions/REQUEST_ID'
```

상단의 `등록된 API`는 접수 상태를 관리하는 목록입니다. 아래 `선택한 API` 영역은 선택한 이름과 모델을 표시하고 해당 API의 연결 정보·요청 테스트·요청 결과·요청 이력만 보여줍니다. API를 바꾸면 앞서 선택한 요청 결과와 이미지 입력을 초기화합니다.

`result.category`는 판별된 상품 카테고리이고 `result.attributes`는 해당 카테고리의 비케이브 속성값입니다. 카테고리를 판별하지 못하면 `category=null`, `category_valid=false`, `schema_valid=false`로 반환하며 모든 속성을 판정에서 제외합니다. `excluded_attributes`에 든 속성은 판정에 사용하지 않습니다. `parse_valid`와 `schema_valid`가 false이면 원문 `raw`를 확인해야 합니다. `succeeded`는 실행이 끝났다는 뜻이며 레이블 정확성을 보장하지 않습니다. 추론 결과는 워크스페이스의 레이블을 변경하지 않습니다.

이전 클라이언트의 선택적 `category` 쿼리 지정은 호환성을 위해 유지하지만, 화면과 기본 호출 예제는 카테고리를 지정하지 않습니다.

`processing_seconds`는 워커의 모델 실행 시작부터 완료까지이며 모델 로딩을 포함하고 큐 대기는 제외합니다. `created_at`, `started_at`, `finished_at`으로 전체 소요 시간과 대기 시간을 계산할 수 있습니다. 페이지의 2.5초 응답 목표와 모델 추론 완료 시간을 구분합니다.

## 관리 API

- `GET /api/model-endpoints`: 등록 목록, 접수 상태, 모델 사용 가능 여부
- `POST /api/model-endpoints`: JSON `name`, `model_id`로 등록
- `PATCH /api/model-endpoints/{id}`: JSON `enabled`로 신규 접수 시작/중지
- `POST /api/model-endpoints/{id}/predictions`: multipart `file` 한 개, 카테고리 자동 판별
- `GET /api/predictions/{id}`: 상태, 대기열 위치, 결과
- `GET /api/model-endpoints/{id}/predictions`: 기본은 최근 20건. `offset`, `limit`(1~100)으로 이전 이력을 조회한다. `paginated=true`이면 `{items, total}`을 반환하며, 화면은 이 모드로 10건씩 조회한다. 기존 호출은 배열 응답을 유지한다.
- `POST /api/jobs/{id}/cancel`: 대기/실행 중인 요청 취소

OpenAPI 명세: `/api/openapi.json`, 대화형 문서: `/api/docs`.

접수 중지는 이미 접수한 작업을 취소하지 않습니다. 이미지 형식은 JPEG/PNG/WebP, 최대 20MB, 2,500만 화소, 단일 프레임입니다. 잘못된 입력은 422, 크기 초과는 413, 중지 또는 사용 불가 모델은 409입니다. API 추론 대기/실행 요청이 합계 32건이면 429와 `Retry-After: 30`을 반환합니다. 이 한도는 기존 학습 작업 수를 포함하지 않습니다. 대기열 순서는 학습 작업을 포함합니다.

## 운영

기존 서비스 `datadrift-pipeline-web`, `datadrift-pipeline-api`, `datadrift-pipeline-worker`를 사용합니다. 공개 접속 주소는 `http://121.126.210.3:18091/ko/model-api`이며 API 내부 포트는 `127.0.0.1:18092`입니다.

```sh
systemctl --user status datadrift-pipeline-web datadrift-pipeline-api datadrift-pipeline-worker
journalctl --user -u datadrift-pipeline-worker -n 100
systemctl --user restart datadrift-pipeline-api datadrift-pipeline-web
# 워커 재시작 전에는 실행/대기 작업이 없는지 확인합니다.
```

설정과 작업 상태는 `.runtime/catalog.sqlite`, 업로드 이미지 사본은 `.runtime/predictions/{request_id}`, 처리 기록은 `.runtime/jobs/{request_id}`에 저장합니다. 기존 백업 범위에 이 경로도 포함해야 합니다. 자동 만료/보존기간 관리는 아직 없으므로 저장 공간을 모니터링합니다. 서비스 재시작 후 접수 설정과 대기 작업은 유지됩니다. 실행 중 워커가 종료되면 해당 작업은 실패로 기록되며 자동 재시도하지 않습니다.

현재 플랫폼과 동일한 내부망 접근 정책입니다. 새 로그인이나 API 키를 추가하지 않았으며 외부 공개용 인증, 호출자별 제한은 별도 작업입니다.
