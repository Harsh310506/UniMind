"""
LLM Service - Groq API integration for conversations, quiz generation, etc.
"""
from typing import List, Optional
from groq import Groq
from app.core.config import settings

# System prompts
RAG_SYSTEM_PROMPT = """You are an intelligent document assistant called UniMind. You answer questions based on the provided context from documents.

INSTRUCTIONS:
1. Answer questions using ONLY information from the provided context
2. If information is not in the context, say "I don't have that information in the provided documents"
3. Cite sources using [Page X] notation when referencing specific information
4. Be concise but comprehensive
5. If the question is unclear, ask for clarification
6. Maintain a professional and helpful tone

CONTEXT:
{context}

When answering, always ground your response in the provided context."""

GENERAL_SYSTEM_PROMPT = """You are UniMind, a helpful and intelligent AI assistant. You can help with general questions, writing, analysis, and more. Be concise, helpful, and professional."""

QUIZ_SYSTEM_PROMPT = """You are an expert quiz creator. Generate {num_questions} multiple-choice questions from the provided content.

CONTENT:
{content}

REQUIREMENTS:
- Difficulty level: {difficulty}
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE option should be correct
- Incorrect options should be plausible but clearly wrong
- Provide a clear explanation for the correct answer
- Questions should test understanding, not just memorization

DIFFICULTY GUIDELINES:
- EASY: Direct recall, definitions, basic facts
- MEDIUM: Application, comparison, analysis
- HARD: Synthesis, evaluation, complex scenarios

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks):
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": 0,
      "explanation": "why this is correct",
      "difficulty": "{difficulty}"
    }}
  ]
}}"""

SENTIMENT_PROMPT = """Analyze the sentiment of the following text. Return ONLY a valid JSON object with these fields:
- "label": one of "POSITIVE", "NEGATIVE", or "NEUTRAL"
- "score": confidence score from 0.0 to 1.0
- "explanation": brief explanation of why

Text: {text}

Return ONLY JSON, no other text."""

SUMMARY_PROMPT = """Provide a comprehensive summary of the following document content.

Return ONLY a valid JSON object with these fields:
- "executive_summary": 2-3 sentence high-level summary
- "detailed_summary": 3-5 paragraph detailed summary
- "key_points": array of bullet point strings (5-10 key points)

CONTENT:
{content}

Return ONLY JSON, no other text."""


def get_groq_client() -> Groq:
    """Get Groq API client"""
    return Groq(api_key=settings.GROQ_API_KEY)


async def chat_completion(
    messages: List[dict],
    model: str = "qwen/qwen3.8-27b",
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send messages to Groq LLM and get response"""
    client = get_groq_client()

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq API error: {e}")
        raise Exception(f"LLM service error: {str(e)}")


async def rag_chat(
    query: str,
    context: str,
    conversation_history: Optional[List[dict]] = None,
) -> str:
    """RAG-based chat with document context"""
    system_prompt = RAG_SYSTEM_PROMPT.format(context=context)

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 5 exchanges)
    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({"role": "user", "content": query})

    return await chat_completion(messages)


async def general_chat(
    query: str,
    conversation_history: Optional[List[dict]] = None,
) -> str:
    """General chat without document context"""
    messages = [{"role": "system", "content": GENERAL_SYSTEM_PROMPT}]

    if conversation_history:
        messages.extend(conversation_history[-10:])

    messages.append({"role": "user", "content": query})

    return await chat_completion(messages)


async def generate_quiz_questions(
    content: str,
    num_questions: int = 10,
    difficulty: str = "MEDIUM",
) -> dict:
    """Generate quiz questions from content using LLM"""
    import json

    prompt = QUIZ_SYSTEM_PROMPT.format(
        num_questions=num_questions,
        content=content,
        difficulty=difficulty,
    )

    messages = [{"role": "user", "content": prompt}]
    response = await chat_completion(messages, temperature=0.5, max_tokens=4096)

    # Parse JSON response
    try:
        # Try to extract JSON from response
        response = response.strip()
        if response.startswith("```"):
            # Remove markdown code blocks
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
            response = response.strip()
        return json.loads(response)
    except json.JSONDecodeError as e:
        print(f"Failed to parse quiz JSON: {e}")
        print(f"Raw response: {response[:500]}")
        raise ValueError("Failed to generate valid quiz questions")


async def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of text using LLM"""
    import json

    prompt = SENTIMENT_PROMPT.format(text=text[:5000])  # limit text length
    messages = [{"role": "user", "content": prompt}]
    response = await chat_completion(messages, temperature=0.3, max_tokens=256)

    try:
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
            response = response.strip()
        return json.loads(response)
    except json.JSONDecodeError:
        return {"label": "NEUTRAL", "score": 0.5, "explanation": "Unable to determine sentiment"}


async def summarize_content(content: str) -> dict:
    """Generate summary of document content using LLM"""
    import json

    prompt = SUMMARY_PROMPT.format(content=content[:8000])
    messages = [{"role": "user", "content": prompt}]
    response = await chat_completion(messages, temperature=0.5, max_tokens=2048)

    try:
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
            response = response.strip()
        return json.loads(response)
    except json.JSONDecodeError:
        return {
            "executive_summary": "Summary generation failed.",
            "detailed_summary": response,
            "key_points": [],
        }
