from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ApplicationHealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str
    timestamp: datetime


class DatabaseHealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["connected"]
    timestamp: datetime

