FROM python:3.12-slim
WORKDIR /app
EXPOSE 8000

# requirements first: docker reuses this layer while they don't change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "wsgi:app"]
