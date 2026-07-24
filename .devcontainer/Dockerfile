FROM python:3.13-alpine

ARG USERNAME=vscode
ARG USER_UID=1111
ARG USER_GID=${USER_UID}
ARG POETRY_VERSION=2.2.1

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN addgroup \
    --gid "${USER_GID}" \
    "${USERNAME}" \
    && adduser \
    --disabled-password \
    --gecos "" \
    --uid "${USER_UID}" \
    --ingroup "${USERNAME}" \
    --shell /bin/bash \
    "${USERNAME}" \
    && apk add --no-cache \
    bash \
    git \
    make \
    nodejs \
    npm \
    sudo \
    && python -m pip install \
    "poetry==${POETRY_VERSION}" \
    && echo "${USERNAME} ALL=(root) NOPASSWD:ALL" \
    > "/etc/sudoers.d/${USERNAME}" \
    && chmod 0440 "/etc/sudoers.d/${USERNAME}" \
    && echo 'PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' \
    > "/home/${USERNAME}/.bashrc" \
    && chown "${USERNAME}:${USERNAME}" \
    "/home/${USERNAME}/.bashrc"

USER ${USERNAME}
WORKDIR /workspace
