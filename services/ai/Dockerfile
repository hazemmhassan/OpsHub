FROM python:3.12.2-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8001

WORKDIR /app

RUN addgroup --system opshub && adduser --system --ingroup opshub opshub

COPY pyproject.toml README.md ./
COPY src ./src

RUN python -m pip install --no-cache-dir .

USER opshub

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8001') + '/health', timeout=2)"

CMD ["sh", "-c", "exec uvicorn opshub_ai.main:app --host 0.0.0.0 --port \"${PORT}\""]
