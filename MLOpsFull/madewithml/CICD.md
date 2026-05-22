# Dockerized Jenkins CI/CD Implementation Log

Date: May 15, 2026
Project: `MLOpsFull`
Jenkins job: `mlopsfull-ci-cd`
Repository branch: `master`
Jenkins URL: `http://localhost:8080`
Deployed API URL: `http://localhost:8000`

## Purpose

This document records the Docker-first CI/CD implementation completed for the `MLOpsFull` project.

The project repository was pulled from GitHub as the base project provided for the assignment. From the beginning of the CI/CD work, the chosen approach was to containerize the complete workflow instead of depending on a manually prepared local Python environment.

The final pipeline can:

- checkout the project from GitHub;
- build a Docker image for the ML application;
- run CI checks inside the Docker image;
- train the model inside a container;
- evaluate the trained model inside a container;
- block deployment if weighted F1 is below the configured threshold;
- push the application image to Docker Hub;
- deploy the trained model with Ray Serve in a Docker container;
- archive training, evaluation, and smoke-test artifacts in Jenkins.

## Initial Repository State

The repository initially contained the ML project source code, datasets, tests, and requirements, but it did not include the Dockerized CI/CD infrastructure.

The main missing CI/CD elements were:

- no Docker image definition for the ML application;
- no Docker Compose stack for Jenkins;
- no custom Jenkins image with Docker CLI support;
- no Docker-first Jenkins pipeline;
- no shared Docker volume for MLflow/Ray model artifacts;
- no Docker Hub image publishing stage;
- no containerized deployment stage.

## New Files Added

The Dockerized setup introduced these new root-level and project-level files:

| File | Purpose |
|---|---|
| `Jenkinsfile` | Defines the full CI/CD pipeline: build, test, train, evaluate, push, and deploy. |
| `Dockerfile.jenkins` | Builds the Jenkins controller image with the Docker CLI installed. |
| `docker-compose.yml` | Starts Jenkins in Docker and connects it to the host Docker daemon. |
| `MLOpsFull/Dockerfile` | Builds the Python 3.10 ML application image. |
| `MLOpsFull/.dockerignore` | Excludes notebooks, caches, logs, artifacts, and local environment files from Docker builds. |

Additional project code updates were made in existing files:

| File | Purpose |
|---|---|
| `MLOpsFull/madewithml/config.py` | Allows storage to be controlled with `MLOPS_STORAGE_DIR`. |
| `MLOpsFull/madewithml/predict.py` | Makes MLflow file URI handling portable. |
| `MLOpsFull/madewithml/serve.py` | Runs Ray Serve on `0.0.0.0:8000` inside Docker and keeps the service alive. |

## Docker Architecture

The final architecture is:

```text
GitHub repository
        |
        v
Jenkins container
        |
        v
Docker build: ayoubmoutik/mlopsfull:<BUILD_NUMBER>
        |
        v
CI / train / evaluate containers
        |
        v
Docker Hub push
        |
        v
Ray Serve deployment container on port 8000
```

Jenkins itself runs in Docker through:

```text
docker-compose.yml
Dockerfile.jenkins
```

The ML application runs in its own image:

```text
MLOpsFull/Dockerfile
```

Model and MLflow artifacts are persisted through the Docker volume:

```text
mlopsfull_storage
```

This volume is mounted inside ML containers at:

```text
/mlops-storage
```

## Jenkins And Docker Compose

The Docker Compose stack exposes Jenkins on:

```text
http://localhost:8080
```

The Jenkins container mounts the Docker socket:

```text
/var/run/docker.sock:/var/run/docker.sock
```

This allows Jenkins to build images, create containers, push to Docker Hub, and deploy the Ray Serve container while still running inside Docker.

The Jenkins image is based on:

```dockerfile
FROM jenkins/jenkins:lts
```

The image installs:

- Docker CLI;
- required package manager tools;
- certificate and GPG utilities needed to add the Docker apt repository.

## ML Application Docker Image

The ML application image is based on:

```dockerfile
FROM python:3.10-slim
```

Python 3.10 was selected because the pinned ML stack, including Ray, MLflow, Torch, and Transformers, is compatible with Python 3.10.

The image sets:

```text
PYTHONPATH=/app
MLOPS_STORAGE_DIR=/mlops-storage
```

The image installs:

- system build tools;
- Python dependencies from `requirements.txt`;
- pinned packaging tools for Ray compatibility:

```text
setuptools==68.2.2
wheel==0.41.2
```

These pins avoid the Ray error:

```text
ModuleNotFoundError: No module named 'pkg_resources._vendor'
```

The image exposes:

```text
8000
```

for the Ray Serve API.

## Jenkins Pipeline Stages

The final Jenkins pipeline contains these stages:

1. `Checkout`
2. `Resolve Branch`
3. `Build Docker Image`
4. `CI Checks`
5. `Train`
6. `Evaluate`
7. `Push Image to Docker Hub`
8. `Deploy`
9. `Post Actions`

The old local-environment approach was avoided. The pipeline does not create a local `.venv`; all commands run inside Docker containers.

## Jenkins Parameters

The pipeline is configurable with:

| Parameter | Default | Purpose |
|---|---:|---|
| `NUM_SAMPLES` | `0` | Use the full dataset for the CI training run. |
| `NUM_EPOCHS` | `6` | Number of training epochs. |
| `BATCH_SIZE` | `16` | Training batch size. |
| `MIN_F1` | `0.85` | Minimum weighted F1 required for deployment. |
| `USE_GPU` | `true` | Use the NVIDIA GPU for the training stage when available. |
| `DEPLOY` | `true` | Enables or disables the deployment stage. |

The values keep the workflow practical while still training on the full dataset and using GPU acceleration when available.

## Docker Image Build

Jenkins builds the ML image with two tags:

```text
ayoubmoutik/mlopsfull:${BUILD_NUMBER}
ayoubmoutik/mlopsfull:latest
```

Example from the successful build:

```text
Successfully tagged ayoubmoutik/mlopsfull:4
Successfully tagged ayoubmoutik/mlopsfull:latest
```

## Containerized CI Checks

The CI checks run inside the built Docker image:

```bash
python -m compileall madewithml
python -m pytest tests -q
python -m flake8 madewithml --select=E9,F63,F7,F82
```

The successful build produced:

```text
4 passed
```

The flake8 command is limited to critical syntax/runtime categories so the build focuses on errors that can break execution.

## Container Script Execution Strategy

Jenkins writes each stage command to a temporary shell script:

```text
docker-stage-${BUILD_NUMBER}.sh
```

Then Jenkins:

1. creates a container from the ML image;
2. copies the script into the container with `docker cp`;
3. starts the container with `docker start -a`;
4. copies artifacts back from `/app/artifacts`;
5. removes the temporary container.

This avoids fragile heredoc/stdin behavior and avoids Jenkins sandbox restrictions such as blocked Groovy `encodeBase64` calls.

## Training Stage

Training runs inside the ML Docker image and calls the Python training function directly:

```python
from madewithml.train import train_model
```

The training configuration is:

```python
train_model(
    experiment_name=os.environ["EXPERIMENT_NAME"],
    dataset_loc="datasets/dataset.csv",
    train_loop_config=json.dumps({
        "dropout_p": 0.5,
        "lr": 0.0001,
        "lr_factor": 0.8,
        "lr_patience": 3,
    }),
    num_workers=1,
    cpu_per_worker=1,
    gpu_per_worker=0,
    num_samples=int(os.environ["NUM_SAMPLES"]),
    num_epochs=int(os.environ["NUM_EPOCHS"]),
    batch_size=int(os.environ["BATCH_SIZE"]),
    results_fp=os.environ["TRAIN_RESULTS"],
)
```

Ray is configured as CPU-only:

```python
ray.init(num_gpus=0, ...)
```

This keeps the pipeline portable and avoids GPU detection problems in a Dockerized local CI environment.

The training stage writes:

```text
MLOpsFull/artifacts/train_results.json
MLOpsFull/artifacts/run_id.txt
```

## Evaluation Stage

The evaluation stage loads the trained run using the `run_id` generated during training.

It evaluates the model on:

```text
datasets/holdout.csv
```

The evaluation stage writes:

```text
MLOpsFull/artifacts/eval_results.json
```

The successful Dockerized run produced:

```text
Weighted F1: 0.9054760519681985
```

The build passed because:

```text
MIN_F1=0.85
```

The build passed the configured model quality gate and continued to image publishing and deployment.

## Docker Hub Push

After the CI, training, and evaluation stages pass, Jenkins logs in to Docker Hub with the credential:

```text
dockerhub-credentials
```

The pipeline pushes:

```text
ayoubmoutik/mlopsfull:${BUILD_NUMBER}
ayoubmoutik/mlopsfull:latest
```

The successful build pushed:

```text
ayoubmoutik/mlopsfull:4
ayoubmoutik/mlopsfull:latest
```

## Deployment Stage

Deployment runs only when:

- `DEPLOY=true`;
- the branch resolves to `master`.

Jenkins starts a Ray Serve container:

```bash
docker run -d \
    --name mlopsfull-serve \
    --shm-size=3g \
    -p 8000:8000 \
    -e GITHUB_USERNAME=AyoubMoutik \
    -e MLOPS_STORAGE_DIR=/mlops-storage \
    -e RUN_ID=<run_id> \
    -v mlopsfull_storage:/mlops-storage \
    ayoubmoutik/mlopsfull:<BUILD_NUMBER> \
    python -m madewithml.serve --run_id <run_id>
```

The service is available at:

```text
http://localhost:8000
```

The pipeline performs smoke checks against:

```text
GET  http://localhost:8000/
POST http://localhost:8000/predict/
```

The deployment stage writes:

```text
MLOpsFull/artifacts/deploy_health.json
MLOpsFull/artifacts/smoke_response.json
```

## Artifact Convention

Jenkins archives:

```groovy
archiveArtifacts artifacts: 'MLOpsFull/artifacts/**/*.json,MLOpsFull/artifacts/**/*.txt,MLOpsFull/artifacts/**/*.log,MLOpsFull/logs/**/*.log', allowEmptyArchive: true
```

Important artifacts:

| File | Purpose |
|---|---|
| `train_results.json` | Training parameters, metrics, and generated `run_id`. |
| `eval_results.json` | Evaluation metrics, per-class metrics, and slice metrics. |
| `run_id.txt` | The MLflow run id passed between pipeline stages. |
| `deploy_health.json` | Health-check response from the deployed Ray Serve API. |
| `smoke_response.json` | Prediction response from the deployment smoke test. |

## Successful Build Summary

The successful Dockerized pipeline run was build `#4`.

The build completed these stages:

- Docker image build;
- CI checks;
- model training;
- model evaluation;
- Docker Hub push;
- Ray Serve deployment;
- artifact archiving.

Observed evaluation result:

```text
Weighted F1: 0.9054760519681985
```

Docker Hub image pushed:

```text
ayoubmoutik/mlopsfull:4
ayoubmoutik/mlopsfull:latest
```

Deployment container started:

```text
mlopsfull-serve
```

Final Jenkins result:

```text
Finished: SUCCESS
```

## Recommended Demo Commands

Start Jenkins:

```powershell
docker compose up -d --build
```

Open Jenkins:

```text
http://localhost:8080
```

Check the deployed API:

```powershell
curl http://localhost:8000/
```

Check the deployed run id:

```powershell
curl http://localhost:8000/run_id/
```

Run a prediction:

```powershell
curl -X POST http://localhost:8000/predict/ `
  -H "Content-Type: application/json" `
  -d "{\"title\":\"Text classification with transformers\",\"description\":\"A project using BERT for NLP classification\"}"
```

## Notes About Model Quality

The CI run trains on the full local dataset with multiple epochs:

```text
NUM_SAMPLES=0
NUM_EPOCHS=6
USE_GPU=true
```

The deployment gate remains configurable:

```text
MIN_F1=0.85
```

The successful Jenkins run produced a weighted F1 of `0.9054760519681985`, passed the stricter `MIN_F1=0.85` gate, created a tracked MLflow run, pushed the Docker image, and deployed the service after smoke checks passed.

## Evidence To Capture For The Report

Recommended screenshots and artifacts:

- Jenkins stage graph with all stages green;
- console output showing `4 passed`;
- console output showing `Weighted F1`;
- console output showing Docker Hub push;
- console output showing `Finished: SUCCESS`;
- Docker Hub page showing image tags `4` and `latest`;
- deployed API response from `http://localhost:8000/`;
- Jenkins archived artifacts page;
- `train_results.json`;
- `eval_results.json`;
- `run_id.txt`;
- `deploy_health.json`;
- `smoke_response.json`.

## Final Pipeline Behavior

The final Dockerized pipeline performs the complete MLOps CI/CD flow:

1. Jenkins checks out the repository.
2. Jenkins resolves the branch.
3. Jenkins builds the ML Docker image.
4. Jenkins runs compile, tests, and critical lint checks inside Docker.
5. Jenkins trains the model inside Docker.
6. Jenkins saves the training artifacts.
7. Jenkins evaluates the trained model inside Docker.
8. Jenkins gates deployment with `MIN_F1`.
9. Jenkins pushes the image to Docker Hub.
10. Jenkins deploys the Ray Serve API in Docker.
11. Jenkins runs deployment smoke checks.
12. Jenkins archives artifacts for the final report.
