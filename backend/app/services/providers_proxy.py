"""Indirection so analytics modules can use the LLM without importing the AI package eagerly."""
from app.services.ai.providers import chat, chat_json  # noqa: F401
