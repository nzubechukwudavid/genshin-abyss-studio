"""
Structured Logging Architecture for Genshin Abyss Studio.
Configures root and application loggers with standardized formatting, ISO timestamps,
and environment-driven log levels.
"""

import os
import sys
import logging

LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.INFO)

LOG_FORMAT = "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=LOG_LEVEL,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    stream=sys.stdout
)

def get_logger(name: str = "genshin_abyss_studio") -> logging.Logger:
    """Returns a named logger within the application hierarchy."""
    if name != "genshin_abyss_studio" and not name.startswith("genshin_abyss_studio."):
        logger_name = f"genshin_abyss_studio.{name}"
    else:
        logger_name = name
    return logging.getLogger(logger_name)

logger = get_logger("app")
