"""Skin Analysis Routes using OpenAI Vision API via Emergent Integrations."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

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


async def perform_skin_analysis(image_base64: str) -> dict:
    """Perform AI skin analysis on a base64 encoded image using Emergent Integrations."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    # Get API key from environment
    api_key = os.environ.get('EMERGENT_LLM_KEY', '') or os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        logger.error("No API key found in environment")
        raise HTTPException(status_code=500, detail="API key not configured. Please contact support.")

    try:
        logger.info("Starting skin analysis with OpenAI Vision API via Emergent Integrations")
        
        # Create a unique session ID for this analysis
        import uuid
        session_id = f"skin-analysis-{uuid.uuid4()}"
        
        # Initialize the chat with system message
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SKIN_ANALYSIS_SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o")
        
        # Create image content from base64
        image_content = ImageContent(
            image_base64=image_base64
        )
        
        # Create user message with image
        user_message = UserMessage(
            text="Analyze this image. First check if there is a clear human face visible. If yes, provide skin analysis. If no clear face, return the error response. Return only valid JSON.",
            file_contents=[image_content]
        )
        
        # Send message and get response
        response_text = await chat.send_message(user_message)
        
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
        raise HTTPException(status_code=500, detail="Failed to parse analysis results. Please try again.")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Skin analysis error: {error_msg}")
        
        # Check for specific errors
        if "invalid_api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(status_code=500, detail="API configuration error. Please contact support.")
        elif "content_policy" in error_msg.lower() or "safety" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Image could not be analyzed. Please ensure your photo shows only your face clearly.")
        elif "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Service is busy. Please try again in a moment.")
        elif "insufficient" in error_msg.lower() or "balance" in error_msg.lower() or "quota" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Service temporarily unavailable. Please try again later.")
        else:
            raise HTTPException(status_code=500, detail=f"Analysis failed. Please try again with a clearer photo.")


class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image


@analysis_router.post("/analyze")
async def analyze_skin(req: AnalyzeRequest):
    """Direct API endpoint for skin analysis (dashboard demo/testing)."""
    result = await perform_skin_analysis(req.image)
    return {"success": True, "result": result}
