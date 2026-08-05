#!/bin/bash
rm -rf .venv
python -m venv .venv
poetry env use 3.13
source .venv/bin/activate
poetry install --no-root -vvvv

# Frontend dependencies
(cd frontend && npm install)

# Let the non-root vscode user use the host-mounted docker socket (docker-from-docker).
[ -S /var/run/docker.sock ] && sudo chmod 666 /var/run/docker.sock
