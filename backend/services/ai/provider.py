from dotenv import load_dotenv
load_dotenv()
from abc import ABC, abstractmethod
import os
import json
import asyncio
from typing import Dict, Any, Optional

USAGE_TRACKER = {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_calls": 0
}

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_structured_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        pass

class GroqProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        from groq import Groq
        self.client = Groq(api_key=api_key)

    async def generate_structured_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        global USAGE_TRACKER
        USAGE_TRACKER["total_calls"] += 1

        structured_prompt = (
            f"{prompt}\n\n"
            f"You MUST return ONLY a valid JSON object matching this schema:\n"
            f"{schema_description}\n"
            f"No markdown, no code blocks, no explanation. Pure JSON only."
        )

        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": structured_prompt}],
                max_tokens=600
            )
            text = response.choices[0].message.content.strip()

            # Strip markdown if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            data = json.loads(text)
            USAGE_TRACKER["prompt_tokens"] += int(len(structured_prompt.split()) * 1.3)
            USAGE_TRACKER["completion_tokens"] += int(len(text.split()) * 1.3)
            return data
        except Exception as e:
            print(f"[GROQ PROVIDER] Failed: {e}")
            raise e

class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_structured_json(self, prompt: str, schema_description: str) -> Dict[str, Any]:
        global USAGE_TRACKER
        USAGE_TRACKER["total_calls"] += 1
        structured_prompt = (
            f"{prompt}\n\nReturn ONLY valid JSON matching:\n{schema_description}\nNo markdown."
        )
        try:
            import google.generativeai as genai
            response = await asyncio.to_thread(self.model.generate_content, structured_prompt)
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.endswith("```"): text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            print(f"[GEMINI PROVIDER] Failed: {e}")
            raise e

def get_active_provider() -> Optional[BaseAIProvider]:
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if groq_key and groq_key != "mock_key":
        try:
            return GroqProvider(api_key=groq_key)
        except Exception as e:
            print(f"[WARN] Groq failed: {e}")

    if gemini_key and gemini_key != "mock_key":
        try:
            return GeminiProvider(api_key=gemini_key)
        except Exception as e:
            print(f"[WARN] Gemini failed: {e}")

    return None

def get_token_usage() -> Dict[str, Any]:
    return USAGE_TRACKER