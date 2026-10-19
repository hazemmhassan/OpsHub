from opshub_ai.app import create_app
from opshub_ai.config import Settings

# BaseSettings supplies required secrets from the process environment at runtime.
app = create_app(Settings())  # type: ignore[call-arg]
