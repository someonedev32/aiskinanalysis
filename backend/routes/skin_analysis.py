"""Skin Analysis Routes using OpenAI Vision API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
analysis_router = APIRouter()

SKIN_ANALYSIS_SYSTEM_PROMPT = """You are an expert cosmetic skin analyst. Your task is to analyze the provided selfie image for skin health.

CRITICAL INSTRUCTIONS FOR FACE DETECTION:
1. This image is a SELFIE taken with a webcam or phone camera for skin analysis purposes.
2. BE EXTREMELY LENIENT with face detection:
   - If you can see ANY skin at all (face, cheek, forehead, chin, nose area) - proceed with analysis
   - If the image shows a person even partially, from any angle - proceed with analysis
   - If the lighting is poor but you can still make out facial features - proceed with analysis
   - If the face is blurry but recognizable as a human face - proceed with analysis
   - If only part of the face is visible (cropped) - analyze whatever skin is visible
3. ONLY return the no_face error if:
   - The image is completely black/white with no content
   - The image shows only objects with absolutely NO human skin visible
   - The image is corrupted or cannot be processed at all

4. When in doubt, ALWAYS choose to analyze rather than reject.

If NO face/skin is visible at all, return ONLY this JSON:
{"error": "no_face", "message": "No face detected. Please position your face in the center of the frame and try again."}

For ANY image where you can see human skin, return this JSON structure:
{
  "skin_type": "one of: Normal, Dry, Oily, Combination, Sensitive",
  "score": number between 40-95 (overall skin health score, be encouraging),
  "concerns": ["list of 2-5 identified skin concerns like Acne, Dark spots, Fine lines, Dehydration, Redness, Uneven tone, Large pores, etc."],
  "severity": "one of: Mild, Moderate, Significant",
  "ingredient_recommendations": [
    {"name": "ingredient name", "benefit": "what it helps with"}
  ],
  "am_routine": [
    {"step": 1, "product_type": "Gentle Cleanser", "description": "specific recommendation based on their skin"},
    {"step": 2, "product_type": "Toner", "description": "specific recommendation"},
    {"step": 3, "product_type": "Serum", "description": "specific recommendation"},
    {"step": 4, "product_type": "Moisturizer", "description": "specific recommendation"},
    {"step": 5, "product_type": "SPF 30+", "description": "specific recommendation"}
  ],
  "pm_routine": [
    {"step": 1, "product_type": "Cleanser", "description": "specific recommendation"},
    {"step": 2, "product_type": "Treatment", "description": "specific recommendation"},
    {"step": 3, "product_type": "Serum", "description": "specific recommendation"},
    {"step": 4, "product_type": "Night Cream", "description": "specific recommendation"}
  ],
  "product_categories": ["list of Shopify product categories to recommend like Moisturizers, Serums, SPF, Cleansers, etc."],
  "summary": "2-3 sentence encouraging summary of findings and key recommendations"
}

Provide 4-6 ingredient recommendations. Be specific in routine descriptions.
This is for cosmetic purposes only, not medical diagnosis. Be encouraging and helpful.
Return ONLY valid JSON, no markdown formatting, no extra text."""


def get_openai_client():
    """Get OpenAI client with your own API key."""
    api_key = os.environ.get('OPENAI_API_KEY', '')
    
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables!")
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Please add OPENAI_API_KEY to your Render environment variables."
        )
    
    # Log that we have a key (just first/last chars for security)
    logger.info(f"Using OpenAI API key: {api_key[:8]}...{api_key[-4:]}")
    
    return AsyncOpenAI(api_key=api_key)


async def perform_skin_analysis(image_base64: str) -> dict:
    """Perform AI skin analysis on a base64 encoded image using OpenAI Vision API.
    
    IMPORTANT: This analyzes HUMAN FACE SKIN only, not general objects.
    Returns dict with either analysis results or error info (never raises for no_face).
    """
    client = get_openai_client()

    try:
        logger.info("Starting skin analysis with OpenAI Vision API (gpt-4o)")
        logger.info(f"Image data length: {len(image_base64)} characters")
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SKIN_ANALYSIS_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Analyze this selfie for skin analysis. The person wants personalized skincare recommendations. Even if the image quality isn't perfect (blurry, poor lighting, partial face, angled), please analyze whatever skin you can see and provide helpful recommendations. Only reject if there is truly no human skin visible at all. Return only valid JSON."
                        },
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
            max_tokens=2000,
            temperature=0.3  # Lower temperature for more consistent responses
        )

        response_text = response.choices[0].message.content.strip()
        logger.info(f"OpenAI response received (length: {len(response_text)})")
        logger.info(f"Response preview: {response_text[:300]}...")
        
        # Clean up response if wrapped in markdown
        if response_text.startswith("```"):
            # Handle ```json or just ```
            first_line_end = response_text.find("\n")
            response_text = response_text[first_line_end+1:].rsplit("```", 1)[0].strip()
            logger.info(f"Cleaned response: {response_text[:200]}...")

        result = json.loads(response_text)
        
        # Check if this is a "no face" error response
        # IMPORTANT: Return as normal response (not HTTP error) so frontend can handle gracefully
        if result.get("error") == "no_face":
            logger.info("No face detected in image")
            return result  # Return the error dict as-is, frontend will handle it
        
        logger.info(f"Skin analysis successful: skin_type={result.get('skin_type')}, score={result.get('score')}")
        return result

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        logger.error(f"Raw response that failed to parse: {response_text[:500] if 'response_text' in dir() else 'N/A'}")
        raise HTTPException(status_code=500, detail="Failed to parse analysis results. Please try again.")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Skin analysis error: {error_msg}")
        logger.error(f"Full exception: {repr(e)}")
        
        # Check for specific OpenAI errors
        if "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower() or "Incorrect API key" in error_msg:
            raise HTTPException(status_code=500, detail="Invalid OpenAI API key. Please check your OPENAI_API_KEY in Render environment variables.")
        elif "content_policy" in error_msg.lower() or "safety" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Image could not be analyzed. Please ensure your photo shows only your face clearly.")
        elif "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="OpenAI rate limit reached. Please try again in a moment.")
        elif "insufficient_quota" in error_msg.lower() or "billing" in error_msg.lower():
            raise HTTPException(status_code=429, detail="OpenAI API quota exceeded. Please check your OpenAI billing at platform.openai.com")
        else:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg[:100]}")


class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image


@analysis_router.post("/analyze")
async def analyze_skin(req: AnalyzeRequest):
    """Direct API endpoint for skin analysis (dashboard demo/testing)."""
    result = await perform_skin_analysis(req.image)
    
    # Check if result is a no_face error
    if result.get("error") == "no_face":
        return {
            "success": False,
            "error": "no_face",
            "message": result.get("message", "No clear face detected. Please ensure your face is well-lit, centered, and clearly visible in the frame.")
        }
    
    return {"success": True, "result": result}
