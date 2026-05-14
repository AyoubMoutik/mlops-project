pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'NUM_SAMPLES', defaultValue: '100', description: 'Number of training samples for the Jenkins run.')
        string(name: 'NUM_EPOCHS', defaultValue: '1', description: 'Number of training epochs.')
        string(name: 'BATCH_SIZE', defaultValue: '16', description: 'Training batch size.')
        string(name: 'MIN_F1', defaultValue: '0.50', description: 'Minimum weighted F1 required for deployment.')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy locally with Ray Serve when evaluation passes.')
    }

    environment {
        PROJECT_DIR = 'MLOpsFull'
        PYTHON = "${WORKSPACE}\\.venv\\Scripts\\python.exe"
        PIP = "${WORKSPACE}\\.venv\\Scripts\\pip.exe"
        RAY = "${WORKSPACE}\\.venv\\Scripts\\ray.exe"
        PYTHONPATH = "${WORKSPACE}\\MLOpsFull"
        GITHUB_USERNAME = 'AyoubMoutik'
        MLOPS_STORAGE_DIR = "${WORKSPACE}\\.mlops-storage"
        EXPERIMENT_NAME = "jenkins-mlopsfull-${BUILD_NUMBER}"
        TRAIN_RESULTS = 'artifacts\\train_results.json'
        EVAL_RESULTS = 'artifacts\\eval_results.json'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Resolve Branch') {
            steps {
                script {
                    def gitBranch = powershell(
                        returnStdout: true,
                        script: '''
                            $branch = git branch --show-current
                            if (-not $branch) {
                                $branch = git rev-parse --abbrev-ref HEAD
                            }
                            $branch
                        '''
                    ).trim()
                    def jenkinsBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    env.ACTUAL_BRANCH = gitBranch ?: jenkinsBranch
                    env.ACTUAL_BRANCH = env.ACTUAL_BRANCH
                        .replace('origin/', '')
                        .replace('*/', '')
                        .trim()
                    env.SCM_BRANCH = jenkinsBranch
                        .replace('origin/', '')
                        .replace('*/', '')
                        .trim()
                    echo "Building branch: ${env.ACTUAL_BRANCH}"
                    echo "SCM branch: ${env.SCM_BRANCH}"
                    echo "DEPLOY parameter: ${params.DEPLOY}"
                }
            }
        }

        stage('Environment') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    py -3.10 --version
                    if (-not (Test-Path ".venv\\Scripts\\python.exe")) {
                        py -3.10 -m venv ".venv"
                        & $env:PYTHON -m pip install --upgrade pip
                        & $env:PIP install -r "$env:PROJECT_DIR\\requirements.txt"
                    }
                    else {
                        Write-Host "Reusing existing virtual environment at .venv"
                    }
                    New-Item -ItemType Directory -Force -Path "$env:PROJECT_DIR\\artifacts" | Out-Null
                    New-Item -ItemType Directory -Force -Path "$env:MLOPS_STORAGE_DIR" | Out-Null
                '''
            }
        }

        stage('CI Checks') {
            steps {
                dir('MLOpsFull') {
                    powershell '''
                        $ErrorActionPreference = "Stop"
                        & $env:PYTHON -m compileall madewithml
                        & $env:PYTHON -m pytest tests -q
                        & $env:PYTHON -m flake8 madewithml --select=E9,F63,F7,F82
                    '''
                }
            }
        }

        stage('Train') {
            steps {
                dir('MLOpsFull') {
                    powershell '''
                        $ErrorActionPreference = "Stop"
                        New-Item -ItemType Directory -Force -Path "artifacts" | Out-Null

                        $script = @'
import json
import os

import ray

from madewithml.train import train_model

if ray.is_initialized():
    ray.shutdown()
ray.init(num_gpus=0, runtime_env={"env_vars": {"GITHUB_USERNAME": os.environ["GITHUB_USERNAME"]}})

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
'@
                        $script | & $env:PYTHON -
                        if ($LASTEXITCODE -ne 0) {
                            throw "Training command failed with exit code $LASTEXITCODE."
                        }

                        $train = Get-Content "$env:TRAIN_RESULTS" -Raw | ConvertFrom-Json
                        if (-not $train.run_id) {
                            throw "Training did not produce a run_id."
                        }
                        $train.run_id | Set-Content "artifacts\\run_id.txt"
                    '''
                }
                script {
                    env.RUN_ID = powershell(
                        returnStdout: true,
                        script: 'Get-Content "MLOpsFull\\artifacts\\run_id.txt"'
                    ).trim()
                }
            }
        }

        stage('Evaluate') {
            steps {
                dir('MLOpsFull') {
                    powershell '''
                        $ErrorActionPreference = "Stop"

                        $script = @'
import os

import ray

from madewithml.evaluate import evaluate

if ray.is_initialized():
    ray.shutdown()
ray.init(
    num_cpus=1,
    num_gpus=0,
    object_store_memory=512 * 1024 * 1024,
    runtime_env={"env_vars": {"GITHUB_USERNAME": os.environ["GITHUB_USERNAME"]}},
)

evaluate(
    run_id=os.environ["RUN_ID"],
    dataset_loc="datasets/holdout.csv",
    results_fp=os.environ["EVAL_RESULTS"],
)
'@
                        $script | & $env:PYTHON -
                        if ($LASTEXITCODE -ne 0) {
                            throw "Evaluation command failed with exit code $LASTEXITCODE."
                        }

                        $eval = Get-Content "$env:EVAL_RESULTS" -Raw | ConvertFrom-Json
                        $f1 = [double]$eval.overall.f1
                        $minF1 = [double]$env:MIN_F1
                        Write-Host "Weighted F1: $f1"
                        if ($f1 -lt $minF1) {
                            throw "Weighted F1 $f1 is below required threshold $minF1."
                        }
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return env.ACTUAL_BRANCH == 'master' || env.SCM_BRANCH == 'master' }
                }
            }
            steps {
                dir('MLOpsFull') {
                    powershell '''
                        $ErrorActionPreference = "Stop"

                        $script = @'
import json
import os

import ray
from numpyencoder import NumpyEncoder

from madewithml import predict

if ray.is_initialized():
    ray.shutdown()
ray.init(
    num_cpus=1,
    num_gpus=0,
    object_store_memory=512 * 1024 * 1024,
    runtime_env={"env_vars": {"GITHUB_USERNAME": os.environ["GITHUB_USERNAME"]}},
)

checkpoint = predict.get_best_checkpoint(run_id=os.environ["RUN_ID"])
predictor = predict.TorchPredictor.from_checkpoint(checkpoint)
sample_ds = ray.data.from_items([
    {
        "title": "Text classification with transformers",
        "description": "A project using BERT for NLP classification",
        "tag": "other",
    }
])
results = predict.predict_proba(ds=sample_ds, predictor=predictor)

payload = {
    "run_id": os.environ["RUN_ID"],
    "status": "ok",
    "deployment_mode": "local_model_smoke_test",
    "results": results,
}
with open("artifacts/smoke_response.json", "w") as fp:
    json.dump(payload, fp, indent=2, cls=NumpyEncoder)
    fp.write("\\n")
'@
                        $script | & $env:PYTHON -
                        if ($LASTEXITCODE -ne 0) {
                            throw "Deployment smoke test failed with exit code $LASTEXITCODE."
                        }
                        $smoke = Get-Content "artifacts\\smoke_response.json" -Raw | ConvertFrom-Json
                        if ($smoke.status -ne "ok") {
                            throw "Deployment smoke test did not return ok status."
                        }
                        Write-Host "Deployment smoke test passed."
                        Write-Host ($smoke | ConvertTo-Json -Depth 10)
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'MLOpsFull/artifacts/**/*.json,MLOpsFull/artifacts/**/*.txt,MLOpsFull/artifacts/**/*.log,MLOpsFull/logs/**/*.log', allowEmptyArchive: true
        }
    }
}
