"""Skin Analysis Routes using OpenAI Vision API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
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


def get_openai_client():
    """Get OpenAI client with the configured API key."""
    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    return AsyncOpenAI(api_key=api_key)


async def perform_skin_analysis(image_base64: str) -> dict:
    """Perform AI skin analysis on a base64 encoded image."""
    client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SKIN_ANALYSIS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this face image for skin type, concerns, and provide a complete skincare analysis. Return only valid JSON."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2000
        )

        response_text = response.choices[0].message.content.strip()
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
