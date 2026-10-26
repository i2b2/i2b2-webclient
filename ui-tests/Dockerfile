# Dockerfile of test_runner Container
FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y \
        chromium \
        chromium-driver && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /tests