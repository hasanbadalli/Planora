import asyncio
import selectors
import sys


def create_compatible_event_loop() -> asyncio.AbstractEventLoop:
    """Create a psycopg-compatible loop on Windows and the default elsewhere."""
    if sys.platform == "win32":
        return asyncio.SelectorEventLoop(selectors.SelectSelector())
    return asyncio.new_event_loop()

