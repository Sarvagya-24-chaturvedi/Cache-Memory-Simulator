FROM python:3.11-slim

# Install system dependencies & Icarus Verilog compiler for live hardware simulation
RUN apt-get update && apt-get install -y --no-install-recommends \
    iverilog \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
ENV PORT=8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "wsgi:app"]