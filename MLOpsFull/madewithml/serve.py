import argparse
import os
import time
from http import HTTPStatus
from typing import Dict

import ray
from fastapi import FastAPI
from ray import serve
from starlette.responses import Response
from starlette.requests import Request

from madewithml import evaluate, monitoring, monitoring_metrics, predict
from madewithml.config import MLFLOW_TRACKING_URI, mlflow

# Define application
app = FastAPI(
    title="Made With ML",
    description="Classify machine learning projects.",
    version="0.1",
)

@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    body, media_type = monitoring_metrics.render_metrics()
    return Response(body, media_type=media_type)


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
        monitoring_metrics.record_request(endpoint="/", method="GET", status="success")
        response = {
            "message": HTTPStatus.OK.phrase,
            "status-code": HTTPStatus.OK,
            "data": {},
        }
        return response

    @app.get("/run_id/")
    def _run_id(self) -> Dict:
        """Get the run ID."""
        monitoring_metrics.record_request(endpoint="/run_id/", method="GET", status="success")
        return {"run_id": self.run_id}

    @app.post("/evaluate/")
    async def _evaluate(self, request: Request) -> Dict:
        start_time = time.perf_counter()
        try:
            data = await request.json()
            results = evaluate.evaluate(run_id=self.run_id, dataset_loc=data.get("dataset"))
            monitoring_metrics.record_request(endpoint="/evaluate/", method="POST", status="success")
            return {"results": results}
        except Exception:
            monitoring_metrics.record_request(endpoint="/evaluate/", method="POST", status="error")
            raise
        finally:
            monitoring_metrics.observe_latency(endpoint="/evaluate/", seconds=time.perf_counter() - start_time)

    @app.post("/predict/")
    async def _predict(self, request: Request):
        start_time = time.perf_counter()
        try:
            data = await request.json()
            title = data.get("title", "")
            description = data.get("description", "")
            monitoring_metrics.observe_input_text_length(monitoring.text_length(title=title, description=description))
            for failure in monitoring.validate_prediction_input(title=title, description=description):
                monitoring_metrics.record_validation_failure(failure)

            sample_ds = ray.data.from_items([{"title": title, "description": description, "tag": ""}])
            results = predict.predict_proba(ds=sample_ds, predictor=self.predictor)

            # Apply custom logic
            for i, result in enumerate(results):
                pred = result["prediction"]
                prob = result["probabilities"]
                if prob[pred] < self.threshold:
                    results[i]["prediction"] = "other"

            summary = monitoring.summarize_predictions(results)
            monitoring_metrics.set_other_rate(summary["other_rate"])
            for result in results:
                monitoring_metrics.record_prediction(result, confidence=monitoring.prediction_confidence(result))

            monitoring_metrics.record_request(endpoint="/predict/", method="POST", status="success")
            return {"results": results, "monitoring": summary}
        except Exception:
            monitoring_metrics.record_request(endpoint="/predict/", method="POST", status="error")
            raise
        finally:
            monitoring_metrics.observe_latency(endpoint="/predict/", seconds=time.perf_counter() - start_time)


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
