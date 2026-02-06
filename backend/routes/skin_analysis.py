"""Skin Analysis Routes using OpenAI Vision API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import os
import uuid
import json
import logging

logger = logging.getLogger(__name__)
analysis_router = APIRouter()

SKIN_ANALYSIS_SYSTEM_PROMPT = """You are an expert cosmetic skin analyst. Analyze the provided face image and return a comprehensive skin analysis. 

IMPORTANT: This is for cosmetic purposes only, not medical diagnosis.

You must return a valid JSON object with exactly this structure:
{
  "skin_type": "one of: Normal, Dry, Oily, Combination, Sensitive",
  "score": number between 0-100 (overall skin health score),
  "concerns": ["list of identified skin concerns like Acne, Dark spots, Wrinkles, Dehydration, Redness, etc."],
  "severity": "one of: Mild, Moderate, Significant",
  "ingredient_recommendations": [
    {"name": "ingredient name", "benefit": "what it helps with"}
  ],
  "am_routine": [
    {"step": 1, "product_type": "Cleanser", "description": "brief recommendation"},
    {"step": 2, "product_type": "Toner", "description": "brief recommendation"},
    {"step": 3, "product_type": "Serum", "description": "brief recommendation"},
    {"step": 4, "product_type": "Moisturizer", "description": "brief recommendation"},
    {"step": 5, "product_type": "SPF", "description": "brief recommendation"}
  ],
  "pm_routine": [
    {"step": 1, "product_type": "Cleanser", "description": "brief recommendation"},
    {"step": 2, "product_type": "Treatment", "description": "brief recommendation"},
    {"step": 3, "product_type": "Serum", "description": "brief recommendation"},
    {"step": 4, "product_type": "Moisturizer", "description": "brief recommendation"}
  ],
  "product_categories": ["list of Shopify product categories to recommend like Moisturizers, Serums, SPF, etc."],
  "summary": "2-3 sentence summary of findings"
}

Return ONLY the JSON object, no markdown formatting, no extra text."""


def get_llm_key():
    """Get the API key - prefer user's own key, fallback to Emergent key."""
    key = os.environ.get('OPENAI_API_KEY', '')
    if not key:
        key = os.environ.get('EMERGENT_LLM_KEY', '')
    return key


async def perform_skin_analysis(image_base64: str) -> dict:
    """Perform AI skin analysis on a base64 encoded image."""
    api_key = get_llm_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"skin-analysis-{uuid.uuid4()}",
            system_message=SKIN_ANALYSIS_SYSTEM_PROMPT
        )
        chat.with_model("openai", "gpt-4o")

        image_content = ImageContent(image_base64=image_base64)

        user_message = UserMessage(
            text="Analyze this face image for skin type, concerns, and provide a complete skincare analysis. Return only valid JSON.",
            file_contents=[image_content]
        )

        response = await chat.send_message(user_message)

        # Parse JSON from response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis results")
    except Exception as e:
        logger.error(f"Skin analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image


@analysis_router.post("/analyze")
async def analyze_skin(req: AnalyzeRequest):
    """Direct API endpoint for skin analysis (dashboard demo/testing)."""
    result = await perform_skin_analysis(req.image)
    return {"success": True, "result": result}
