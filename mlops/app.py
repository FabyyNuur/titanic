import os

from mlops.api.app_factory import create_app

app = create_app()


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


if __name__ == "__main__":
    app.run(
        host=os.getenv("MLOPS_HOST", "0.0.0.0"),
        port=_env_int("MLOPS_PORT", 8000),
        debug=_env_bool("MLOPS_DEBUG", default=False),
    )
