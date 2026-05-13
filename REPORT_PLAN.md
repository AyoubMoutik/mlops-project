# MLOps Exam Project - Implementation And Report Plan

## 1. Project Understanding

This project is an end-to-end MLOps workflow based on a machine learning text classification application. The provided material does not contain direct questions. Instead, the assignment appears to require applying the course concepts to the cloned repositories and documenting the work in a final report.

The main repository, `MLOpsFull`, contains the ML application code. It includes data ingestion, preprocessing, training, evaluation, prediction, and serving modules. The second repository, `Monitoring-ML`, explains and demonstrates monitoring concepts such as model performance tracking, data drift, target drift, concept drift, and statistical drift detection.

The final project should show how the ML system can move from experimentation to a more production-ready MLOps workflow using:

- Python scripts instead of only notebooks
- logging
- reproducibility practices
- MLflow model tracking
- Jenkins CI/CD
- model serving
- monitoring with Grafana, and optionally Prometheus or another metrics source
- drift detection concepts from the monitoring notebook

## 2. Main Objective

The objective is to build and explain a complete MLOps pipeline for a machine learning project. The project should demonstrate how a model can be trained, evaluated, tracked, deployed, monitored, and improved through automation.

The final report should not only describe the code, but also explain the role of each MLOps component and how the components work together.

## 3. Repositories And Materials

### 3.1 Course PDFs

The provided PDFs cover the main theoretical parts of the assignment:

- `0.Moving from Notebooks to Scripts.pdf`
- `1.Logging.pdf`
- `2.Reproducibility.pdf`
- `3.CI-CD.pdf`
- `4.Monitoring.pdf`

These PDFs should be used as the theoretical foundation of the report.

### 3.2 MLOpsFull Repository

This repository contains the main ML project. Important files:

- `mlops_Mine - Copy.ipynb`: original notebook-style workflow
- `madewithml/config.py`: shared configuration, logging, MLflow paths
- `madewithml/data.py`: data loading, splitting, cleaning, preprocessing
- `madewithml/models.py`: model architecture
- `madewithml/train.py`: model training workload
- `madewithml/tune.py`: hyperparameter tuning workload
- `madewithml/evaluate.py`: evaluation metrics and slice metrics
- `madewithml/predict.py`: batch or local prediction logic
- `madewithml/serve.py`: FastAPI and Ray Serve deployment
- `requirements.txt`: Python dependencies
- `datasets/`: project datasets

### 3.3 Monitoring-ML Repository

This repository contains monitoring examples and explanations. It should be used to support the monitoring section of the report.

Important topics:

- cumulative vs sliding performance metrics
- data drift
- target drift
- concept drift
- Great Expectations for data validation
- KS test for numerical drift
- Chi-square test for categorical drift
- MMD for multivariate drift
- online drift detection

## 4. Work To Implement Or Demonstrate

## 4.1 Environment Setup

The report should explain how the project environment is prepared.

Steps:

1. Create or activate a Python virtual environment.
2. Install the required dependencies from `requirements.txt`.
3. Verify that the project modules can be imported.
4. Initialize or verify Git repository configuration.
5. Confirm dataset availability in the `datasets/` directory.

Possible commands to document:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 4.2 From Notebook To Scripts

The report should explain why notebooks are useful for experimentation but not enough for production.

Points to cover:

- notebooks are interactive but can hide state
- scripts are easier to test, reuse, automate, and deploy
- the original notebook workflow is divided into clear Python modules
- each module has one main responsibility

Mapping between notebook sections and scripts:

| Notebook Part | Script |
| --- | --- |
| data ingestion and cleaning | `madewithml/data.py` |
| model definition | `madewithml/models.py` |
| training loop | `madewithml/train.py` |
| hyperparameter tuning | `madewithml/tune.py` |
| evaluation | `madewithml/evaluate.py` |
| prediction | `madewithml/predict.py` |
| serving | `madewithml/serve.py` |
| shared configuration | `madewithml/config.py` |
| shared helpers | `madewithml/utils.py` |

Expected report output:

- explain the project architecture
- include a tree structure of the repository
- explain the responsibility of each module
- mention how Typer CLI commands allow workloads to be executed from the terminal

## 4.3 Logging

The project already contains a logging setup in `madewithml/config.py`.

The report should cover:

- why logging is better than print statements
- logging levels: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- handlers: console handler, info file handler, error file handler
- log files generated in the `logs/` directory
- how training and evaluation results are logged

Implementation evidence:

- `LOGS_DIR` is created in `config.py`
- `info.log` stores informative logs
- `error.log` stores error logs
- `logger.info(...)` is used in training, prediction, and evaluation workflows

Expected report output:

- screenshot or extract of logs if available
- explanation of what information is logged
- explanation of how logs help debugging and auditing

## 4.4 Reproducibility

The report should explain how the project supports reproducibility.

Points to cover:

- Git tracks code changes
- datasets are stored in the repository for this educational project
- MLflow tracks model experiments and artifacts
- training configuration is saved
- checkpoints are created during training
- seeds are set for more deterministic behavior

Important files:

- `madewithml/config.py`
- `madewithml/train.py`
- `madewithml/utils.py`
- `requirements.txt`

Expected report output:

- explain code versioning with Git
- explain dependency versioning with `requirements.txt`
- explain model versioning with MLflow
- explain where MLflow artifacts are stored
- explain what would change in production, such as using S3, PostgreSQL, DVC, or remote MLflow tracking

## 4.5 Training Workflow

The report should explain the training workflow.

Steps to cover:

1. Load dataset.
2. Split dataset with stratification.
3. Preprocess text.
4. Tokenize using SciBERT tokenizer.
5. Train the model.
6. Log metrics with MLflow.
7. Save checkpoints.
8. Save or display training results.

Important file:

- `madewithml/train.py`

Example command to document:

```bash
python -m madewithml.train train-model \
  --experiment-name made-with-ml \
  --dataset-loc datasets/dataset.csv \
  --train-loop-config '{"dropout_p": 0.5, "lr": 1e-4, "lr_factor": 0.8, "lr_patience": 3}' \
  --num-workers 1 \
  --cpu-per-worker 1 \
  --gpu-per-worker 0 \
  --num-samples 100 \
  --num-epochs 1 \
  --batch-size 16
```

The exact command may need to be adjusted depending on the machine resources.

## 4.6 Evaluation Workflow

The report should explain how the model is evaluated.

Metrics to cover:

- precision
- recall
- F1-score
- per-class metrics
- slice metrics

Important file:

- `madewithml/evaluate.py`

Example command to document:

```bash
python -m madewithml.evaluate evaluate \
  --run-id <MLFLOW_RUN_ID> \
  --dataset-loc datasets/holdout.csv
```

Expected report output:

- show overall metrics
- show per-class metrics
- explain why slice metrics are useful
- explain how evaluation can decide whether a model should be deployed

## 4.7 Prediction And Serving

The report should explain two types of inference:

- offline or batch prediction
- online prediction through an API

Important files:

- `madewithml/predict.py`
- `madewithml/serve.py`

Serving stack:

- FastAPI defines the API
- Ray Serve deploys the model service
- `/predict/` endpoint returns predictions
- `/evaluate/` endpoint can evaluate a model through the API

Example prediction command:

```bash
python -m madewithml.predict predict \
  --run-id <MLFLOW_RUN_ID> \
  --title "Text classification with transformers" \
  --description "A project using BERT for NLP classification"
```

Expected report output:

- explain API endpoints
- show example request and response
- explain the confidence threshold logic that maps uncertain predictions to `other`

## 4.8 Jenkins CI/CD

Jenkins should be used to automate the MLOps workflow.

The report should explain what CI/CD means for ML:

- CI checks that code changes do not break the project
- CD automates training, evaluation, and deployment when conditions are satisfied
- ML pipelines require extra checks because model quality matters, not only code correctness

Recommended Jenkins pipeline stages:

1. Checkout source code from Git.
2. Create Python environment.
3. Install dependencies.
4. Run formatting or linting checks.
5. Run tests, if tests are added.
6. Train the model.
7. Evaluate the model.
8. Compare metrics against a threshold.
9. Register or keep the model if it passes.
10. Deploy the model service.
11. Archive logs, metrics, and reports.

Suggested `Jenkinsfile` structure:

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                bat 'python -m venv .venv'
                bat '.venv\\Scripts\\pip install -r requirements.txt'
            }
        }

        stage('Lint') {
            steps {
                bat '.venv\\Scripts\\python -m flake8 madewithml'
            }
        }

        stage('Train') {
            steps {
                bat '.venv\\Scripts\\python -m madewithml.train train-model --help'
            }
        }

        stage('Evaluate') {
            steps {
                bat '.venv\\Scripts\\python -m madewithml.evaluate evaluate --help'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploy model service if evaluation passes'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'logs/**/*.log', allowEmptyArchive: true
        }
    }
}
```

This is a starting point. The real pipeline can be extended after confirming which commands run successfully on the local machine or Jenkins server.

Expected report output:

- Jenkins architecture diagram or explanation
- screenshot of Jenkins pipeline stages
- explanation of each stage
- explanation of when deployment should happen
- discussion of metric thresholds for deployment decisions

## 4.9 Monitoring With Grafana

Grafana can be used to visualize application and model metrics.

Grafana itself is mainly a dashboard tool, so it usually needs a data source such as:

- Prometheus
- Loki
- InfluxDB
- PostgreSQL
- Elasticsearch
- Cloud monitoring services

Recommended monitoring architecture:

1. The model API exposes or logs metrics.
2. Prometheus collects numerical metrics, or Loki collects logs.
3. Grafana visualizes metrics and logs.
4. Alerts are configured when thresholds are crossed.

Metrics to monitor:

System metrics:

- API uptime
- request count
- error rate
- latency
- CPU usage
- memory usage

Model metrics:

- prediction count by class
- confidence score distribution
- percentage of predictions classified as `other`
- model F1-score over time if ground truth is available
- data drift indicators
- target drift indicators

Suggested Grafana dashboards:

- API health dashboard
- model prediction dashboard
- model performance dashboard
- drift monitoring dashboard
- logs dashboard

Expected report output:

- explain why monitoring is needed after deployment
- explain the difference between system monitoring and model monitoring
- include Grafana dashboard screenshots if implemented
- include alert examples

## 4.10 Drift Detection

The monitoring notebook should be used to explain drift detection.

Types of drift to cover:

- data drift: input feature distribution changes
- target drift: output label distribution changes
- concept drift: relationship between inputs and labels changes

Methods from the monitoring repo:

- Great Expectations for rule-based data validation
- KS test for numerical feature drift
- Chi-square test for categorical drift
- MMD for multivariate drift
- online drift detection with sliding windows

Possible implementation for this project:

- monitor text length distribution
- monitor class prediction distribution
- monitor confidence scores
- monitor percentage of unknown or `other` predictions
- compare current production window against training reference data

Expected report output:

- explain reference window and test window
- explain how drift alerts can be triggered
- explain how drift should be investigated
- explain possible actions after drift is detected

## 5. Proposed Final Report Structure

The final report can use the following structure.

### 1. Introduction

- context of the project
- objective of applying MLOps concepts
- short description of the ML task

### 2. Project Architecture

- repository structure
- explanation of important files
- architecture diagram if possible

### 3. From Notebook To Scripts

- limitations of notebooks
- script organization
- explanation of each module

### 4. Logging

- logging configuration
- log levels
- log files
- examples from the project

### 5. Reproducibility

- Git versioning
- dependency versioning
- dataset versioning
- MLflow experiment tracking
- checkpoints and artifacts

### 6. Training Pipeline

- data loading
- preprocessing
- model training
- MLflow logging
- checkpointing

### 7. Evaluation Pipeline

- overall metrics
- per-class metrics
- slice metrics
- decision criteria for deployment

### 8. Model Serving

- FastAPI
- Ray Serve
- prediction endpoint
- evaluation endpoint
- confidence threshold logic

### 9. Jenkins CI/CD Pipeline

- Jenkins role
- pipeline stages
- training and evaluation automation
- deployment decision
- screenshots or logs from Jenkins

### 10. Monitoring With Grafana

- system monitoring
- model monitoring
- Grafana dashboards
- metrics and logs
- alerting strategy

### 11. Drift Detection

- data drift
- target drift
- concept drift
- statistical tests
- reference and test windows
- actions after detecting drift

### 12. Limitations And Improvements

- limited local resources
- possible dependency issues
- lack of production cloud storage
- possible future improvements:
  - Docker
  - Prometheus
  - Loki
  - DVC
  - remote MLflow server
  - Kubernetes
  - automated retraining

### 13. Conclusion

- summarize what was implemented
- summarize the value of MLOps
- explain how the workflow improves reliability, reproducibility, and deployment quality

## 6. Deliverables Checklist

Minimum deliverables:

- final report in PDF or DOCX format
- project repository with scripts
- Jenkins pipeline file or Jenkins pipeline screenshots
- logs generated by the application
- MLflow experiment evidence
- evaluation results
- monitoring explanation

Recommended deliverables:

- `README.md` explaining how to run the project
- `Jenkinsfile`
- simple tests
- screenshots from Jenkins
- screenshots from MLflow
- screenshots from Grafana
- API request and response examples
- drift detection examples from `Monitoring-ML`

## 7. Practical Implementation Order

Recommended order of work:

1. Understand and document the existing code structure.
2. Create or update a project `README.md`.
3. Verify dependency installation.
4. Run basic module imports.
5. Run or document training with a small sample size.
6. Run or document evaluation.
7. Generate MLflow evidence.
8. Confirm logs are created.
9. Add a simple Jenkins pipeline.
10. Configure Jenkins to run the pipeline.
11. Add or describe model serving.
12. Configure monitoring approach with Grafana.
13. Add screenshots and outputs to the report.
14. Write final report.

## 8. Notes For The Report

Because the assignment did not provide explicit questions, the report should clearly state that the project is treated as a practical MLOps implementation based on the topics from the course PDFs.

The report should focus on explaining decisions, not only showing commands. For every tool, answer:

- What is it?
- Why is it needed?
- Where is it used in the project?
- What evidence shows that it works?
- How would it be improved in production?

This will make the report stronger and easier for the teacher to evaluate.
