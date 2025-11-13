# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
ARG PYTHON_VERSION=3.12
ARG VERSION_OVERRIDE
ARG BRANCH_OVERRIDE

################################ Overview

# This Dockerfile builds a Label Studio environment.
# It consists of three main stages:
# 1. "frontend-builder" - Compiles the frontend assets using Node.
# 2. "frontend-version-generator" - Generates version files for frontend sources.
# 3. "venv-builder" - Prepares the virtualenv environment using base image.
# 4. "py-version-generator" - Generates version files for python sources.
# 5. "prod" - Creates the final production image with the Label Studio, Nginx, and other dependencies.

################################ Stage: frontend-builder (build frontend assets)
FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION} AS frontend-builder
ENV BUILD_NO_SERVER=true \
    BUILD_NO_HASH=true \
    BUILD_NO_CHUNKS=true \
    BUILD_MODULE=true \
    YARN_CACHE_FOLDER=/root/web/.yarn \
    NX_CACHE_DIRECTORY=/root/web/.nx \
    NODE_ENV=production

WORKDIR /label-studio/web

# Fix Docker Arm64 Build
RUN yarn config set registry https://registry.npmjs.org/
RUN yarn config set network-timeout 1200000 # HTTP timeout used when downloading packages, set to 20 minutes

COPY labelstudio/web/package.json .
COPY labelstudio/web/yarn.lock .
COPY labelstudio/web/.yarnrc.yml .
COPY labelstudio/web/tools tools
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    yarn install --prefer-offline --no-progress --ignore-engines --non-interactive --production=false

COPY labelstudio/web .
COPY labelstudio/pyproject.toml ../pyproject.toml
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    yarn run build

################################ Stage: frontend-version-generator
FROM frontend-builder AS frontend-version-generator
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    --mount=type=bind,source=.git/modules/labelstudio,target=../git-source,ro \
    cp -r ../git-source ../.git && \
    sed -i '/^\s*worktree\s*=/d' ../.git/config && \
    yarn version:libs

################################ Stage: qocr-builder (build qocr-core package)
FROM qocr-base:latest AS qocr-builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR="/tmp/.cache" \
    UV_HTTP_TIMEOUT=300

WORKDIR /qocr-build

# Copy q-ocr/core source
COPY q-ocr/core .

# Build the qocr-core package as wheel (only .pyc files will be included)
RUN --mount=type=cache,target=$UV_CACHE_DIR,sharing=locked \
    ./scripts/build.sh /wheels

################################ Stage: venv-builder (prepare the virtualenv)
FROM qocr-base:latest AS venv-builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR="/tmp/.cache" \
    UV_HTTP_TIMEOUT=300

WORKDIR /label-studio

# Copy dependency files
COPY labelstudio/pyproject.toml labelstudio/uv.lock labelstudio/README.md ./

# Copy the built qocr-core wheel
COPY --from=qocr-builder /wheels /wheels

# Install qocr-core from wheel first
RUN --mount=type=cache,target=${UV_CACHE_DIR},sharing=locked \
    /bin/sh -c 'for whl_file in /wheels/*.whl; do uv pip install . "${whl_file}[core]"; done'

# Install LS
COPY labelstudio/label_studio label_studio

# 베이스 이미지에서 이미 설치된 패키지들 확인
RUN echo "Base image packages:" && uv pip list | wc -l && echo "---"

# Disable local path references in Docker environment (use wheel instead)
RUN sed -i '/^\[tool\.uv\.sources\]/,/^$/s/^/# /' pyproject.toml && \
    echo "# Note: qocr-core installed from wheel in Docker build" >> pyproject.toml

RUN sed -i '/qocr-core/d' pyproject.toml

# Install labelstudio with uwsgi (qocr-core already installed via wheel)
RUN --mount=type=cache,target=$UV_CACHE_DIR,sharing=locked \
    uv pip install -e ".[uwsgi]"

# Run Django collectstatic using virtual environment python with verbose output
RUN /opt/venv/bin/python label_studio/manage.py collectstatic --no-input --verbosity=2 --force-color

################################ Stage: py-version-generator
FROM venv-builder AS py-version-generator
ARG VERSION_OVERRIDE
ARG BRANCH_OVERRIDE

# Create version_.py and ls-version_.py
RUN --mount=type=bind,source=.git/modules/labelstudio,target=./git-source,ro \
    cp -r ./git-source ./.git && \
    sed -i '/^\s*worktree\s*=/d' .git/config && \
    VERSION_OVERRIDE=${VERSION_OVERRIDE} BRANCH_OVERRIDE=${BRANCH_OVERRIDE} /opt/venv/bin/python label_studio/core/version.py

################################### Stage: prod - Using base image
FROM qocr-base:latest AS production

ENV LS_DIR=/label-studio \
    HOME=/label-studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    VIRTUAL_ENV="/opt/venv" \
    UV_PROJECT_ENVIRONMENT="/opt/venv"

WORKDIR $LS_DIR

RUN set -eux; \
    mkdir -p $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR

COPY labelstudio/deploy/default.conf /etc/nginx/nginx.conf

# Copy essential files for installing Label Studio and its dependencies
COPY labelstudio/pyproject.toml .
COPY labelstudio/uv.lock .
COPY labelstudio/README.md .
COPY labelstudio/mineru.json $LS_DIR/mineru.json
COPY labelstudio/mineru.json $LS_DIR/label_studio/mineru.json
COPY labelstudio/LICENSE .
COPY labelstudio/licenses licenses
COPY labelstudio/deploy deploy
COPY labelstudio/label_studio/fixtures $LS_DIR/label_studio/fixtures

# Grant execute permissions to the entrypoint script
RUN chmod +x $LS_DIR/deploy/docker-entrypoint.sh
RUN mkdir -p output/images

# Copy files from build stages
COPY --from=venv-builder               $UV_PROJECT_ENVIRONMENT                           $UV_PROJECT_ENVIRONMENT
COPY --from=venv-builder               $LS_DIR                                           $LS_DIR
COPY --from=py-version-generator       $LS_DIR/label_studio/core/version_.py             $LS_DIR/label_studio/core/version_.py
COPY --from=frontend-builder           $LS_DIR/web/dist                                  $LS_DIR/web/dist
COPY --from=frontend-version-generator $LS_DIR/web/dist/apps/labelstudio/version.json    $LS_DIR/web/dist/apps/labelstudio/version.json
COPY --from=frontend-version-generator $LS_DIR/web/dist/libs/editor/version.json         $LS_DIR/web/dist/libs/editor/version.json
COPY --from=frontend-version-generator $LS_DIR/web/dist/libs/datamanager/version.json    $LS_DIR/web/dist/libs/datamanager/version.json

# Check if drf-yasg is properly installed and collect static files
RUN /opt/venv/bin/python -c "import drf_yasg; print('drf-yasg version:', drf_yasg.__version__)"
RUN /opt/venv/bin/python $LS_DIR/label_studio/manage.py collectstatic --no-input --verbosity=2 --force-color
RUN ls -la $LS_DIR/label_studio/core/static_build/drf-yasg/ || echo "drf-yasg static files not found"

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
