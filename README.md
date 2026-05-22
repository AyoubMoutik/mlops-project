# MLOpsFull

![Python](https://img.shields.io/badge/Python-3.10-blue)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED)
![Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins-D24939)
![Monitoring](https://img.shields.io/badge/Monitoring-Prometheus%20%2B%20Grafana-F46800)

End-to-end MLOps project for training, evaluating, serving, and monitoring a machine learning model that classifies machine learning project descriptions by tag.

The repository combines a Python ML package, a Dockerized FastAPI prediction service, a Jenkins pipeline, MLflow experiment tracking, and Prometheus/Grafana observability.

## Highlights

- Text classification pipeline built with PyTorch, Transformers, Ray Train, and MLflow.
- Reproducible training and evaluation workflows with saved artifacts and run IDs.
- FastAPI inference service with `/predict/`, `/evaluate/`, `/run_id/`, and `/metrics` endpoints.
- Prometheus metrics for request status, latency, prediction confidence, validation failures, and class distribution.
- Grafana provisioning for a ready-to-use monitoring dashboard.
- Jenkins CI/CD pipeline for build, tests, training, evaluation gate, Docker Hub push, and local deployment.

## Repository Structure

```text
.
+-- MLOpsFull/
|   +-- madewithml/          # ML package: data, training, evaluation, prediction, serving, monitoring
|   +-- datasets/            # Training and holdout datasets
|   +-- tests/               # Pytest test suite
|   +-- Dockerfile           # Runtime image for training and serving
|   +-- requirements.txt     # Python dependencies
+-- monitoring/
|   +-- prometheus.yml       # Prometheus scrape configuration
|   +-- grafana/             # Provisioned Grafana datasource and dashboard
+-- docker-compose.yml       # Jenkins, serving, Prometheus, and Grafana services
+-- Dockerfile.jenkins       # Jenkins controller image
+-- Jenkinsfile              # CI/CD pipeline
```

## Quick Start

### 1. Create a Python environment

```bash
cd MLOpsFull
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
cd MLOpsFull
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Run tests

```bash
python -m pytest tests -q
```

### 3. Train a model

```bash
python -m madewithml.train train-model \
  --experiment-name local-mlopsfull \
  --dataset-loc datasets/dataset.csv \
  --train-loop-config '{"dropout_p":0.3,"lr":0.00002,"lr_factor":0.5,"lr_patience":1}' \
  --num-workers 1 \
  --cpu-per-worker 1 \
  --gpu-per-worker 0 \
  --num-epochs 1 \
  --batch-size 16 \
  --results-fp artifacts/train_results.json
```

The training output contains the MLflow `run_id` used for evaluation and serving.

### 4. Serve the model

```bash
python -m madewithml.serve --run_id <RUN_ID> --backend fastapi
```

The API starts on:

```text
http://localhost:8000
```

Example prediction request:

```bash
curl -X POST http://localhost:8000/predict/ \
  -H "Content-Type: application/json" \
  -d '{"title":"Text classification with transformers","description":"A project using BERT for NLP classification"}'
```

## Docker And Monitoring

Start Prometheus and Grafana:

```bash
docker compose up -d prometheus grafana
```

After a model has been trained, serve it with the monitoring profile:

```bash
RUN_ID=<RUN_ID> docker compose --profile serve up -d mlopsfull-serve prometheus grafana
```

Useful local URLs:

| Service | URL |
| --- | --- |
| FastAPI service | http://localhost:8000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

Default Grafana credentials are `admin` / `admin`.

## CI/CD Pipeline

The `Jenkinsfile` automates the main MLOps lifecycle:

1. Build the Docker image.
2. Run compile, unit test, and flake8 checks.
3. Train the model inside Docker.
4. Evaluate against the holdout dataset.
5. Enforce a minimum weighted F1 threshold.
6. Push the image to Docker Hub.
7. Deploy the service locally when running on `master`.
8. Archive training, evaluation, deployment, and monitoring artifacts.

Jenkins can be started with:

```bash
docker compose up -d jenkins
```

Then open:

```text
http://localhost:8080
```

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `GET` | `/run_id/` | Current model run ID |
| `POST` | `/predict/` | Predict a tag from a title and description |
| `POST` | `/evaluate/` | Evaluate a run against a dataset |
| `GET` | `/metrics` | Prometheus metrics |

## Notes

- MLflow artifacts are stored under `MLOPS_STORAGE_DIR` when defined.
- Local runtime outputs such as `MLOpsFull/artifacts/`, `MLOpsFull/logs/`, `MLOpsFull/efs/`, and `report/` are ignored by git.
- Markdown files are ignored by default, except for this root `README.md`.
