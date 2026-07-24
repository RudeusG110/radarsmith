#!/bin/bash
rm -rf .venv
python -m venv .venv
poetry env use 3.13
source .venv/bin/activate
poetry install --no-root -vvvv

# Frontend dependencies
(cd frontend && npm install)
