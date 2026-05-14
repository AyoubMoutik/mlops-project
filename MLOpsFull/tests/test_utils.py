from madewithml import utils


def test_save_and_load_dict_roundtrip(tmp_path):
    path = tmp_path / "nested" / "results.json"
    payload = {"run_id": "abc123", "metrics": {"f1": 0.75}}

    utils.save_dict(payload, str(path))

    assert utils.load_dict(str(path)) == payload
