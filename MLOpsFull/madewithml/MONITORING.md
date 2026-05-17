# Monitoring Implementation Log

Date: May 16, 2026
Project: `MLOpsFull`
Jenkins job: `mlopsfull-ci-cd`
Repository branch: `master`
Model API URL: `http://localhost:8000`
Prometheus URL: `http://localhost:9090`
Grafana URL: `http://localhost:3000`

## Purpose

This document records the monitoring implementation completed for the `MLOpsFull` project.

The monitoring work was based on the course material in `4.Monitoring.pdf` and the teacher-provided `Monitoring-ML` repository. The goal was to move from theoretical monitoring concepts to a working local monitoring stack connected to the deployed ML API.

The final monitoring setup can:

- expose live model and API metrics from the deployed service;
- collect metrics with Prometheus;
- visualize metrics with Grafana;
- validate deployment health from Jenkins;
- validate prediction and metrics endpoints before marking deployment successful;
- track prediction behavior such as confidence, predicted classes, text length, and `other` rate;
- provide simple drift helper logic for report discussion and future extension.

## Monitoring Concepts Used

The monitoring lesson explains that a deployed ML system needs more than basic API uptime checks.

The course material mainly focuses on ML monitoring: data drift, target drift, concept drift, recent-window performance, and how to react when model behavior degrades.

In this project, API/system checks are included only as supporting deployment evidence. They confirm that the service is reachable and that Prometheus can scrape it, but the main monitoring contribution is model behavior monitoring.

The final implementation covers these layers:

| Layer | Purpose |
|---|---|
| API availability checks | Supporting evidence that the deployed service is reachable and scrapeable. |
| Model behavior monitoring | Tracks prediction classes, confidence, input length, and fallback predictions. |
| Drift monitoring foundation | Provides helper functions for comparing reference data with production-like data. |

Important concepts from the monitoring material:

- cumulative metrics can hide recent performance decay;
- sliding or recent-window metrics are better for detecting degradation;
- data drift happens when input distributions change;
- target drift happens when label distributions change;
- concept drift happens when the relationship between inputs and labels changes;
- monitoring should follow an alert, inspect, act workflow.

## New Files Added

The monitoring implementation introduced these files:

| File | Purpose |
|---|---|
| `MLOpsFull/madewithml/monitoring.py` | Contains input validation, text length calculation, prediction summaries, confidence extraction, and lightweight drift checks. |
| `MLOpsFull/madewithml/monitoring_metrics.py` | Defines Prometheus metrics through lazy helper functions. |
| `MLOpsFull/tests/test_monitoring.py` | Tests monitoring helper logic. |
| `MLOpsFull/scripts/send_monitoring_traffic.py` | Sends repeated prediction requests with different scenarios to populate Prometheus and Grafana. |
| `monitoring/prometheus.yml` | Prometheus scrape configuration. |
| `monitoring/grafana/provisioning/datasources/prometheus.yml` | Automatically configures Prometheus as a Grafana data source. |
| `monitoring/grafana/provisioning/dashboards/dashboards.yml` | Automatically loads Grafana dashboards. |
| `monitoring/grafana/dashboards/mlopsfull-monitoring.json` | Starter dashboard for API and model monitoring. |

Existing files were also updated:

| File | Purpose |
|---|---|
| `MLOpsFull/madewithml/serve.py` | Adds `/metrics`, records monitoring metrics, and supports a stable FastAPI backend for local deployment. |
| `MLOpsFull/madewithml/predict.py` | Converts prediction probabilities to Python floats and supports direct in-memory API prediction without creating a Ray dataset per request. |
| `MLOpsFull/requirements.txt` | Adds `prometheus-client`. |
| `docker-compose.yml` | Adds Prometheus and Grafana services. |
| `Jenkinsfile` | Adds deployment smoke checks for health, prediction, and metrics endpoints, and starts Ray in a lighter CI mode. |

## Monitoring Architecture

The final local monitoring architecture is:

```text
Jenkins
  |
  v
Deploys model API container: mlopsfull-serve
  |
  v
FastAPI model API exposes /metrics
  |
  v
Prometheus scrapes mlopsfull-serve:8000/metrics
  |
  v
Grafana visualizes Prometheus metrics
```

The running services are:

| Container | Purpose | URL |
|---|---|---|
| `mlops-jenkins` | CI/CD automation | `http://localhost:8080` |
| `mlopsfull-serve` | Deployed model API | `http://localhost:8000` |
| `mlops-prometheus` | Metrics collection | `http://localhost:9090` |
| `mlops-grafana` | Metrics dashboard | `http://localhost:3000` |

## API Metrics Endpoint

The model service exposes:

```text
GET /metrics
```

This endpoint returns Prometheus-format metrics.

Example check:

```powershell
curl http://localhost:8000/metrics
```

The endpoint is created in `serve.py`:

```python
@app.get("/metrics")
def metrics() -> Response:
    body, media_type = monitoring_metrics.render_metrics()
    return Response(body, media_type=media_type)
```

## Metrics Collected

The implementation records these metrics:

| Metric | Meaning |
|---|---|
| `mlopsfull_requests_total` | Number of requests by endpoint, method, and status. |
| `mlopsfull_request_latency_seconds` | Request latency for prediction and evaluation endpoints. |
| `mlopsfull_predictions_total` | Number of predictions by predicted class. |
| `mlopsfull_prediction_confidence` | Distribution of prediction confidence values. |
| `mlopsfull_input_text_length_tokens` | Input title and description length in tokens. |
| `mlopsfull_other_prediction_rate` | Latest rate of predictions mapped to the fallback `other` class. |
| `mlopsfull_input_validation_failures_total` | Count of failed input expectations. |

These metrics allow us to monitor both API health and model behavior.

## Input Validation

The monitoring helper validates that prediction requests contain a non-empty title and description.

Implemented checks:

```python
validate_prediction_input(title="", description="")
```

Possible failures:

```text
title_empty
description_empty
```

These failures are counted by Prometheus as:

```text
mlopsfull_input_validation_failures_total
```

## Prediction Monitoring

For every prediction request, the service records:

- input text length;
- predicted class;
- prediction confidence;
- whether prediction was mapped to `other`;
- summary of predictions returned by the request.

The `/predict/` response now includes a monitoring summary:

```json
{
  "results": [...],
  "monitoring": {
    "total": 1,
    "class_counts": {...},
    "avg_confidence": 0.0,
    "min_confidence": 0.0,
    "other_rate": 0.0
  }
}
```

This helps demonstrate that monitoring information is produced directly by the deployed API.

## Drift Detection Foundation

The file `monitoring.py` includes lightweight drift helpers:

| Function | Purpose |
|---|---|
| `detect_text_length_drift` | Compares reference and current text length distributions. |
| `detect_class_distribution_drift` | Compares reference and current class distributions. |

These functions are intentionally simple and educational. They are suitable for report discussion and future extension, while the heavier monitoring notebook examples such as MMD drift detection are kept as theoretical references.

Possible project-specific drift checks:

- compare training text lengths against production text lengths;
- compare expected class distribution against live prediction distribution;
- monitor increases in `other` predictions;
- monitor drops in prediction confidence;
- monitor shifts in input size or malformed requests.

## Prometheus Configuration

Prometheus is configured in:

```text
monitoring/prometheus.yml
```

The important scrape job is:

```yaml
- job_name: mlopsfull-api
  metrics_path: /metrics
  static_configs:
    - targets:
        - mlopsfull-serve:8000
```

Because Prometheus runs inside Docker, it scrapes the model API through the Docker network name:

```text
mlopsfull-serve:8000
```

The target should appear as `UP` at:

```text
http://localhost:9090/targets
```

## Grafana Dashboard

Grafana is available at:

```text
http://localhost:3000
```

Default login:

```text
admin / admin
```

The dashboard is provisioned automatically under:

```text
Dashboards -> MLOps -> MLOpsFull API And Model Monitoring
```

Dashboard panels include:

- API request rate;
- request latency p95;
- predictions by class;
- latest `other` prediction rate;
- average input text length;
- prediction confidence;
- input expectation failures.

## Docker Compose Monitoring Services

The root `docker-compose.yml` was extended with:

```text
prometheus
grafana
```

Start the monitoring stack:

```powershell
docker compose up -d prometheus grafana
```

Check containers:

```powershell
docker ps
```

Expected containers after successful Jenkins deployment:

```text
mlops-jenkins
mlopsfull-serve
mlops-prometheus
mlops-grafana
```

## Jenkins Deployment Checks

The Jenkins deployment stage now validates three endpoints:

```text
GET  /
POST /predict/
GET  /metrics
```

Jenkins writes these artifacts:

| Artifact | Purpose |
|---|---|
| `deploy_health.json` | Response from the health endpoint. |
| `smoke_response.json` | Response from the prediction endpoint. |
| `metrics_smoke.txt` | Response from the Prometheus metrics endpoint. |
| `deploy_container.log` | Container logs if deployment or smoke tests fail. |

The successful pipeline proves that:

- the service started;
- the model loaded;
- predictions work;
- metrics are exposed;
- Prometheus can later scrape the service.

## Serving Backend Decision

The original project uses Ray Serve for deployment. Ray is still used in this project for:

- Ray Data;
- Ray Train;
- Ray AIR checkpoints and results;
- prediction workloads using Ray datasets;
- optional Ray Serve mode.

During local Jenkins deployment, Ray Serve's HTTP proxy was unstable in the Docker setup. The observed error was:

```text
ray.exceptions.RayActorError: HTTPProxyActor died
HTTP proxy UNHEALTHY
```

To make the monitoring demo reliable, the deployed API uses the FastAPI backend:

```bash
python -m madewithml.serve --run_id <run_id> --backend fastapi
```

Ray Serve remains available through:

```bash
python -m madewithml.serve --run_id <run_id> --backend ray-serve
```

This is a practical local deployment decision. It keeps Ray in the training and data workflow while making Prometheus/Grafana monitoring stable for the report demonstration.

The prediction endpoint was also adjusted to avoid creating a Ray dataset for every single API request. Earlier, repeated requests could fail with:

```text
ray.exceptions.RaySystemError: System error: Broken pipe
```

The deployed FastAPI service now performs single-request inference directly in memory while Ray remains part of the training, evaluation, and dataset workflow.

## Final Successful Result

The final Jenkins pipeline completed successfully.

Important results:

```text
run_id: 490aa7bb2c654054ace086acffd7996c
weighted F1: 0.2014707645577715
MIN_F1 threshold: 0.15
deployment decision: passed
```

Successful Jenkins checks:

```text
CI checks: passed
Training: passed
Evaluation: passed
Docker image push: passed
Deployment health check: passed
Prediction smoke test: passed
Metrics smoke test: passed
Final result: SUCCESS
```

The model quality is limited because the Jenkins run uses:

```text
NUM_SAMPLES=100
NUM_EPOCHS=1
```

The purpose of this run is to demonstrate the MLOps workflow and monitoring integration, not to produce the best possible model.

## Traffic Generation Result

To populate Prometheus and Grafana with realistic API activity, a traffic generation script was added:

```text
MLOpsFull/scripts/send_monitoring_traffic.py
```

Example command:

```powershell
cd MLOpsFull
python scripts/send_monitoring_traffic.py --url http://localhost:8000/predict/ --requests 100
```

The traffic script sends multiple scenarios:

- NLP transformer text;
- computer vision text;
- MLOps text;
- graph learning text;
- reinforcement learning text;
- very short text;
- long text;
- unknown business-domain text;
- empty title;
- empty description.

Observed result from the monitoring traffic run:

```text
Total requests: 100
HTTP 200 responses: 100
HTTP errors: 0
```

The service stayed healthy during repeated prediction requests, which confirms that:

- the deployed API can handle repeated local traffic;
- prediction metrics are recorded continuously;
- Prometheus has fresh data to scrape;
- Grafana panels can display real request and model behavior.

The model behavior observed during this test was:

```text
Predicted class: other for all requests
Other prediction rate: 1.00
Average confidence: approximately 0.07 to 0.08
```

This is an important monitoring finding. The monitoring system is working, and it revealed that the deployed model is weak for the tested scenarios. The model is operational, but its predictions are low-confidence and biased toward the fallback `other` class. This is expected for the current demo because the Jenkins training run uses a very small sample and only one epoch.

## Demo Commands

Check API health:

```powershell
curl http://localhost:8000/
```

Check metrics:

```powershell
curl http://localhost:8000/metrics
```

Run a prediction in PowerShell:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8000/predict/" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"title":"Text classification with transformers","description":"A project using BERT for NLP classification"}'
```

Run a prediction using real curl:

```powershell
curl.exe -X POST "http://localhost:8000/predict/" `
  -H "Content-Type: application/json" `
  -d "{\"title\":\"Text classification with transformers\",\"description\":\"A project using BERT for NLP classification\"}"
```

Generate monitoring traffic:

```powershell
cd MLOpsFull
python scripts/send_monitoring_traffic.py --url http://localhost:8000/predict/ --requests 100
```

Open Prometheus targets:

```text
http://localhost:9090/targets
```

Open Grafana:

```text
http://localhost:3000
```

## Evidence To Capture For The Report

Recommended screenshots and artifacts:

- Jenkins successful build with all stages green;
- Jenkins artifact list showing `metrics_smoke.txt`;
- `deploy_health.json`;
- `smoke_response.json`;
- `metrics_smoke.txt`;
- Prometheus targets page showing `mlopsfull-api` as `UP`;
- Grafana dashboard with panels populated;
- Docker containers running with `docker ps`;
- API `/metrics` response;
- prediction response containing the `monitoring` summary.
- terminal output from `send_monitoring_traffic.py` showing `100` successful requests;
- Grafana panels after traffic generation, especially prediction class, confidence, and `other` rate.

## Limitations And Future Improvements

Current limitations:

- monitoring is local and Docker-based;
- no external alert manager is configured;
- model quality is low because Jenkins uses a small training sample;
- the latest traffic test predicted `other` for every scenario, showing model bias/undertraining;
- drift helpers are implemented but not yet scheduled as a recurring production job;
- Ray reported memory pressure during local runs because the machine is resource constrained.

Possible improvements:

- add Prometheus alert rules;
- add Alertmanager, email, Slack, or Teams notifications;
- store monitoring events in a database;
- run drift checks on scheduled production windows;
- use more data and epochs for stronger model quality;
- investigate why the deployed model over-predicts `other`;
- compare monitoring results before and after retraining with more samples;
- deploy to Kubernetes or a managed ML platform;
- use Ray Serve in a better-resourced environment.

## Final Monitoring Behavior

The final monitoring workflow is:

1. Jenkins trains and evaluates the model.
2. Jenkins deploys the model API.
3. The API exposes `/metrics`.
4. Prometheus scrapes API and model metrics.
5. Grafana visualizes the collected metrics.
6. Jenkins verifies health, prediction, and metrics endpoints before marking deployment successful.

This completes the monitoring part of the MLOps project and provides concrete evidence for the final report.
