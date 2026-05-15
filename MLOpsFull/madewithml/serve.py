import argparse
import os
import time
from http import HTTPStatus
from typing import Dict

import ray
from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from ray import serve
from starlette.responses import Response
from starlette.requests import Request

from madewithml import evaluate, monitoring, predict
from madewithml.config import MLFLOW_TRACKING_URI, mlflow

# Define application
app = FastAPI(
    title="Made With ML",
    description="Classify machine learning projects.",
    version="0.1",
)

REQUEST_COUNT = Counter(
    "mlopsfull_requests_total",
    "Total HTTP requests handled by the model service.",
    ["endpoint", "method", "status"],
)
REQUEST_LATENCY = Histogram(
    "mlopsfull_request_latency_seconds",
    "Prediction and evaluation request latency.",
    ["endpoint"],
)
PREDICTION_COUNT = Counter(
    "mlopsfull_predictions_total",
    "Total predictions emitted by class.",
    ["prediction"],
)
PREDICTION_CONFIDENCE = Histogram(
    "mlopsfull_prediction_confidence",
    "Confidence score assigned to emitted predictions.",
    buckets=(0.0, 0.25, 0.5, 0.75, 0.9, 0.95, 1.0),
)
INPUT_TEXT_LENGTH = Histogram(
    "mlopsfull_input_text_length_tokens",
    "Input title and description length in whitespace-delimited tokens.",
    buckets=(0, 5, 10, 25, 50, 100, 250, 500),
)
OTHER_PREDICTION_RATE = Gauge(
    "mlopsfull_other_prediction_rate",
    "Rate of predictions mapped to the fallback other class in the latest request.",
)
VALIDATION_FAILURES = Counter(
    "mlopsfull_input_validation_failures_total",
    "Total input expectation failures.",
    ["failure"],
)


@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@serve.deployment(num_replicas="1", ray_actor_options={"num_cpus": 8, "num_gpus": 0})
@serve.ingress(app)
class ModelDeployment:
    def __init__(self, run_id: str, threshold: int = 0.9):
        """Initialize the model."""
        self.run_id = run_id
        self.threshold = threshold
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)  # so workers have access to model registry
        best_checkpoint = predict.get_best_checkpoint(run_id=run_id)
        self.predictor = predict.TorchPredictor.from_checkpoint(best_checkpoint)

    @app.get("/")
    def _index(self) -> Dict:
        """Health check."""
        REQUEST_COUNT.labels(endpoint="/", method="GET", status="success").inc()
        response = {
            "message": HTTPStatus.OK.phrase,
            "status-code": HTTPStatus.OK,
            "data": {},
        }
        return response

    @app.get("/run_id/")
    def _run_id(self) -> Dict:
        """Get the run ID."""
        REQUEST_COUNT.labels(endpoint="/run_id/", method="GET", status="success").inc()
        return {"run_id": self.run_id}

    @app.post("/evaluate/")
    async def _evaluate(self, request: Request) -> Dict:
        start_time = time.perf_counter()
        try:
            data = await request.json()
            results = evaluate.evaluate(run_id=self.run_id, dataset_loc=data.get("dataset"))
            REQUEST_COUNT.labels(endpoint="/evaluate/", method="POST", status="success").inc()
            return {"results": results}
        except Exception:
            REQUEST_COUNT.labels(endpoint="/evaluate/", method="POST", status="error").inc()
            raise
        finally:
            REQUEST_LATENCY.labels(endpoint="/evaluate/").observe(time.perf_counter() - start_time)

    @app.post("/predict/")
    async def _predict(self, request: Request):
        start_time = time.perf_counter()
        try:
            data = await request.json()
            title = data.get("title", "")
            description = data.get("description", "")
            INPUT_TEXT_LENGTH.observe(monitoring.text_length(title=title, description=description))
            for failure in monitoring.validate_prediction_input(title=title, description=description):
                VALIDATION_FAILURES.labels(failure=failure).inc()

            sample_ds = ray.data.from_items([{"title": title, "description": description, "tag": ""}])
            results = predict.predict_proba(ds=sample_ds, predictor=self.predictor)

            # Apply custom logic
            for i, result in enumerate(results):
                pred = result["prediction"]
                prob = result["probabilities"]
                if prob[pred] < self.threshold:
                    results[i]["prediction"] = "other"

            summary = monitoring.summarize_predictions(results)
            OTHER_PREDICTION_RATE.set(summary["other_rate"])
            for result in results:
                PREDICTION_COUNT.labels(prediction=result["prediction"]).inc()
                PREDICTION_CONFIDENCE.observe(monitoring.prediction_confidence(result))

            REQUEST_COUNT.labels(endpoint="/predict/", method="POST", status="success").inc()
            return {"results": results, "monitoring": summary}
        except Exception:
            REQUEST_COUNT.labels(endpoint="/predict/", method="POST", status="error").inc()
            raise
        finally:
            REQUEST_LATENCY.labels(endpoint="/predict/").observe(time.perf_counter() - start_time)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run_id", required=True, help="run ID to use for serving.")
    parser.add_argument("--threshold", type=float, default=0.9, help="threshold for `other` class.")
    args = parser.parse_args()
    ray.init(num_gpus=0, runtime_env={"env_vars": {"GITHUB_USERNAME": os.environ["GITHUB_USERNAME"]}})
    serve.start(http_options={"host": "0.0.0.0", "port": 8000})
    serve.run(ModelDeployment.bind(run_id=args.run_id, threshold=args.threshold))
    while True:
        time.sleep(3600)
