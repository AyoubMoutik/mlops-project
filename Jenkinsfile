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
        string(name: 'MIN_F1', defaultValue: '0.15', description: 'Minimum weighted F1 required for deployment.')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy locally with Ray Serve when evaluation passes.')
    }

    environment {
        PROJECT_DIR = 'MLOpsFull'
        DOCKERHUB_NAMESPACE = 'ayoubmoutik'
        IMAGE_REPO = "${DOCKERHUB_NAMESPACE}/mlopsfull"
        IMAGE_TAG = "${BUILD_NUMBER}"
        IMAGE_NAME = "${IMAGE_REPO}:${IMAGE_TAG}"
        LATEST_IMAGE = "${IMAGE_REPO}:latest"
        SERVICE_CONTAINER = 'mlopsfull-serve'
        MLOPS_DOCKER_VOLUME = 'mlopsfull_storage'
        GITHUB_USERNAME = 'AyoubMoutik'
        MLOPS_STORAGE_DIR = '/mlops-storage'
        EXPERIMENT_NAME = "jenkins-mlopsfull-${BUILD_NUMBER}"
        TRAIN_RESULTS = 'artifacts/train_results.json'
        EVAL_RESULTS = 'artifacts/eval_results.json'
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
                    def gitBranch = sh(
                        returnStdout: true,
                        script: '''
                            set +e
                            branch="$(git branch --show-current 2>/dev/null)"
                            if [ -z "$branch" ]; then
                                branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
                            fi
                            printf '%s' "$branch"
                        '''
                    ).trim()
                    def jenkinsBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    env.ACTUAL_BRANCH = (gitBranch ?: jenkinsBranch)
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

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -eux
                    docker build \
                        --file "$PROJECT_DIR/Dockerfile" \
                        --tag "$IMAGE_NAME" \
                        --tag "$LATEST_IMAGE" \
                        "$PROJECT_DIR"
                '''
            }
        }

        stage('CI Checks') {
            steps {
                script {
                    dockerRun('''
                        python -m compileall madewithml
                        python -m pytest tests -q
                        python -m flake8 madewithml --select=E9,F63,F7,F82
                    ''')
                }
            }
        }

        stage('Train') {
            steps {
                script {
                    dockerRun('''
                        mkdir -p artifacts
                        python - <<'PY'
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
PY
                        python - <<'PY'
import json
import os
from pathlib import Path

results_fp = Path(os.environ["TRAIN_RESULTS"])
train = json.loads(results_fp.read_text())
run_id = train.get("run_id")
if not run_id:
    raise SystemExit("Training did not produce a run_id.")
Path("artifacts/run_id.txt").write_text(run_id + "\\n")
PY
                    ''')
                    env.RUN_ID = sh(returnStdout: true, script: 'cat MLOpsFull/artifacts/run_id.txt').trim()
                    echo "Training run_id: ${env.RUN_ID}"
                }
            }
        }

        stage('Evaluate') {
            steps {
                script {
                    dockerRun('''
                        python - <<'PY'
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
PY
                        python - <<'PY'
import json
import os
from pathlib import Path

eval_results = json.loads(Path(os.environ["EVAL_RESULTS"]).read_text())
f1 = float(eval_results["overall"]["f1"])
min_f1 = float(os.environ["MIN_F1"])
print(f"Weighted F1: {f1}")
if f1 < min_f1:
    raise SystemExit(f"Weighted F1 {f1} is below required threshold {min_f1}.")
PY
                    ''')
                }
            }
        }

        stage('Push Image to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_TOKEN')]) {
                    sh '''
                        set -eux
                        printf '%s' "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin
                        docker push "$IMAGE_NAME"
                        docker push "$LATEST_IMAGE"
                        docker logout
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
                sh '''
                    set -eux
                    docker rm -f "$SERVICE_CONTAINER" >/dev/null 2>&1 || true
                    monitoring_network_args=""
                    service_url="http://localhost:8000"
                    if docker network inspect examprojet_default >/dev/null 2>&1; then
                        monitoring_network_args="--network examprojet_default"
                        service_url="http://$SERVICE_CONTAINER:8000"
                    fi
                    docker run -d \
                        --name "$SERVICE_CONTAINER" \
                        $monitoring_network_args \
                        --shm-size=3g \
                        -p 8000:8000 \
                        -e GITHUB_USERNAME="$GITHUB_USERNAME" \
                        -e MLOPS_STORAGE_DIR="$MLOPS_STORAGE_DIR" \
                        -e RUN_ID="$RUN_ID" \
                        -v "$MLOPS_DOCKER_VOLUME:/mlops-storage" \
                        "$IMAGE_NAME" \
                        python -m madewithml.serve --run_id "$RUN_ID"

                    healthy=0
                    for attempt in $(seq 1 120); do
                        if curl --fail --silent "$service_url/" > "$PROJECT_DIR/artifacts/deploy_health.json"; then
                            healthy=1
                            break
                        fi
                        sleep 2
                    done
                    if [ "$healthy" -ne 1 ]; then
                        docker logs "$SERVICE_CONTAINER" > "$PROJECT_DIR/artifacts/deploy_container.log" 2>&1 || true
                        echo "Model service did not become healthy. See deploy_container.log."
                        exit 1
                    fi
                    curl --fail --silent "$service_url/" > "$PROJECT_DIR/artifacts/deploy_health.json"
                    curl --fail --silent \
                        --header 'Content-Type: application/json' \
                        --data '{"title":"Text classification with transformers","description":"A project using BERT for NLP classification"}' \
                        "$service_url/predict/" > "$PROJECT_DIR/artifacts/smoke_response.json"
                    curl --fail --silent "$service_url/metrics" > "$PROJECT_DIR/artifacts/metrics_smoke.txt"
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'MLOpsFull/artifacts/**/*.json,MLOpsFull/artifacts/**/*.txt,MLOpsFull/artifacts/**/*.log,MLOpsFull/logs/**/*.log', allowEmptyArchive: true
        }
    }
}

void dockerRun(String command) {
    def scriptName = "docker-stage-${env.BUILD_NUMBER}.sh"
    writeFile file: scriptName, text: "#!/bin/sh\nset -eux\n${command.stripIndent().trim()}\n"
    sh """
        set -eux
        mkdir -p "\$WORKSPACE/\$PROJECT_DIR/artifacts"
        docker volume create "\$MLOPS_DOCKER_VOLUME" >/dev/null
        container_name="mlopsfull-\$BUILD_NUMBER-\$(date +%s%N)"
        cleanup() {
            status=\$?
            docker cp "\$container_name:/app/artifacts/." "\$WORKSPACE/\$PROJECT_DIR/artifacts/" >/dev/null 2>&1 || true
            docker rm -f "\$container_name" >/dev/null 2>&1 || true
            exit \$status
        }
        trap cleanup EXIT
        docker create \
            --name "\$container_name" \
            --shm-size=3g \
            -e GITHUB_USERNAME="\$GITHUB_USERNAME" \
            -e MLOPS_STORAGE_DIR="\$MLOPS_STORAGE_DIR" \
            -e EXPERIMENT_NAME="\$EXPERIMENT_NAME" \
            -e TRAIN_RESULTS="\$TRAIN_RESULTS" \
            -e EVAL_RESULTS="\$EVAL_RESULTS" \
            -e NUM_SAMPLES="${params.NUM_SAMPLES}" \
            -e NUM_EPOCHS="${params.NUM_EPOCHS}" \
            -e BATCH_SIZE="${params.BATCH_SIZE}" \
            -e MIN_F1="${params.MIN_F1}" \
            -e RUN_ID="\${RUN_ID:-}" \
            -v "\$MLOPS_DOCKER_VOLUME:/mlops-storage" \
            "\$IMAGE_NAME" \
            sh /tmp/jenkins-stage.sh
        docker cp "${scriptName}" "\$container_name:/tmp/jenkins-stage.sh"
        docker start -a "\$container_name"
    """
    sh "rm -f '${scriptName}'"
}
