"""Ortak FastAPI bağımlılıkları."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from api.auth import current_user

CurrentUser = Annotated[str, Depends(current_user)]
