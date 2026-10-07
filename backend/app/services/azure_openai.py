from __future__ import annotations

import json
from typing import Any

from openai import AzureOpenAI

from app.core.config import settings


def azure_configured() -> bool:
    return bool(
        settings.azure_openai_api_key
        and settings.azure_openai_endpoint
        and settings.azure_openai_deployment
    )


def get_azure_client() -> AzureOpenAI | None:
    if not azure_configured():
        return None
    return AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint.rstrip("/"),
    )


def chat_completion(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 1200,
) -> tuple[str, str]:
    """
    Returns (content, source) where source is 'azure_openai' or raises.
    """
    client = get_azure_client()
    if not client:
        raise RuntimeError("Azure OpenAI is not configured")

    response = client.chat.completions.create(
        model=settings.azure_openai_deployment,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = response.choices[0].message.content or ""
    return content, "azure_openai"


def chat_json(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.1,
) -> tuple[dict[str, Any], str]:
    content, source = chat_completion(
        system_prompt + "\nRespond with valid JSON only.",
        user_prompt,
        temperature=temperature,
    )
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    return json.loads(cleaned), source
