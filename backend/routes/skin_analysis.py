"""Skin Analysis Routes using OpenAI Vision API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
import json
import logging

logger = logging.getLogger(__name__)
analysis_router = APIRouter()

SKIN_ANALYSIS_SYSTEM_PROMPT = """You are an expert cosmetic skin analyst. Analyze the provided image for skin analysis.

IMPORTANT INSTRUCTIONS:
1. FIRST check if the image contains a clear human face. If NO face is visible or the face is unclear/blurry/too dark/too far, return:
   {"error": "no_face", "message": "No clear face detected. Please ensure your face is well-lit, centered, and clearly visible in the frame."}

2. If a clear face IS visible, analyze the skin and return a comprehensive analysis.

This is for cosmetic purposes only, not medical diagnosis.

For successful face detection, return this JSON structure:
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
    # Try multiple possible API key sources
    api_key = os.environ.get('OPENAI_API_KEY', '') or os.environ.get('EMERGENT_LLM_KEY', '')
    if not api_key:
        logger.error("No OpenAI API key found in environment")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured. Please contact support.")
    return AsyncOpenAI(api_key=api_key)


async def perform_skin_analysis(image_base64: str) -> dict:
    """Perform AI skin analysis on a base64 encoded image."""
    client = get_openai_client()

    try:
        logger.info("Starting skin analysis with OpenAI Vision API")
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SKIN_ANALYSIS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this image. First check if there is a clear human face visible. If yes, provide skin analysis. If no clear face, return the error response. Return only valid JSON."},
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
        logger.info(f"OpenAI response received: {response_text[:200]}...")
        
        # Clean up response if wrapped in markdown
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(response_text)
        
        # Check if this is a "no face" error response
        if result.get("error") == "no_face":
            logger.info("No face detected in image")
            raise HTTPException(
                status_code=400, 
                detail=result.get("message", "No clear face detected. Please take a clearer photo with your face centered and well-lit.")
            )
        
        logger.info(f"Skin analysis successful: skin_type={result.get('skin_type')}, score={result.get('score')}")
        return result

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        logger.error(f"Raw response: {response_text if 'response_text' in dir() else 'N/A'}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis results. Please try again.")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Skin analysis error: {error_msg}")
        
        # Check for specific OpenAI errors
        if "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(status_code=500, detail="API configuration error. Please contact support.")
        elif "content_policy" in error_msg.lower() or "safety" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Image could not be analyzed. Please ensure your photo shows only your face clearly.")
        elif "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Service is busy. Please try again in a moment.")
        else:
            raise HTTPException(status_code=500, detail=f"Analysis failed. Please try again with a clearer photo.")


class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image


@analysis_router.post("/analyze")
async def analyze_skin(req: AnalyzeRequest):
    """Direct API endpoint for skin analysis (dashboard demo/testing)."""
    result = await perform_skin_analysis(req.image)
    return {"success": True, "result": result}
