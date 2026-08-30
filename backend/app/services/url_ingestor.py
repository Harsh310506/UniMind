"""
URL & YouTube Ingestor Service - Scrapes and extracts text from web pages and YouTube transcripts
"""
import re
import httpx
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
from youtube_transcript_api import YouTubeTranscriptApi


def extract_youtube_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various YouTube URL formats"""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/shorts\/([0-9A-Za-z_-]{11})",
        r"youtube\.com\/embed\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


async def ingest_youtube_url(url: str) -> Dict[str, Any]:
    """
    Extract transcript from a YouTube video using YouTubeTranscriptApi instance
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL. Please provide a valid YouTube video link.")

    transcript_list = None
    api = YouTubeTranscriptApi()

    # Attempt 1: Fetch directly (default language)
    try:
        transcript_list = api.fetch(video_id)
    except Exception:
        # Attempt 2: Try common language codes
        try:
            transcript_list = api.fetch(video_id, languages=["en", "en-US", "en-GB", "hi", "es", "fr", "de"])
        except Exception:
            # Attempt 3: List all available transcripts and take first one
            try:
                transcript_manifest = api.list(video_id)
                for t in transcript_manifest:
                    transcript_list = t.fetch()
                    if transcript_list:
                        break
            except Exception as e:
                raise ValueError(
                    f"Could not retrieve captions for this YouTube video. "
                    f"Please ensure the video has closed captions/subtitles enabled. ({str(e)})"
                )

    if not transcript_list:
        raise ValueError("No transcript text found for this YouTube video.")

    # Combine transcript text
    full_text_parts = []
    for entry in transcript_list:
        text = entry.text if hasattr(entry, "text") else entry.get("text", "") if isinstance(entry, dict) else str(entry)
        text = text.strip()
        if text:
            full_text_parts.append(text)

    full_text = " ".join(full_text_parts)
    if len(full_text) < 20:
        raise ValueError("Transcript content is too short or empty for this video.")

    # Attempt to get title from oEmbed API
    title = f"YouTube Video ({video_id})"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            oembed_res = await client.get(f"https://www.youtube.com/oembed?url={url}&format=json")
            if oembed_res.status_code == 200:
                data = oembed_res.json()
                title = data.get("title", title)
    except Exception:
        pass

    return {
        "title": title,
        "text": full_text,
        "source_type": "YOUTUBE",
        "url": url,
        "video_id": video_id,
    }


async def ingest_web_article(url: str) -> Dict[str, Any]:
    """
    Fetch and extract clean article text from any web URL
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise ValueError(f"Web server returned HTTP {response.status_code}")
            
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        # Remove irrelevant elements
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "svg", "button", "iframe"]):
            element.decompose()

        # Extract title
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text().strip()
        else:
            title = url.split("//")[-1].split("/")[0]

        # Try to find main article container first
        article_tag = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"content|article|post|body", re.I))
        if article_tag:
            paragraphs = article_tag.find_all(["p", "h1", "h2", "h3", "h4", "li"])
        else:
            paragraphs = soup.find_all(["p", "h1", "h2", "h3", "h4", "li"])

        text_lines = []
        for p in paragraphs:
            t = p.get_text().strip()
            if len(t) > 20:  # Skip tiny fragments
                text_lines.append(t)

        full_text = "\n\n".join(text_lines)
        if len(full_text) < 100:
            # Fallback to general text extraction
            full_text = soup.get_text(separator="\n", strip=True)

        if len(full_text) < 50:
            raise ValueError("Could not extract readable article text from this web page.")

        return {
            "title": title,
            "text": full_text,
            "source_type": "WEB",
            "url": url,
        }
    except Exception as e:
        raise ValueError(f"Failed to extract web article: {str(e)}")


async def ingest_url_content(url: str) -> Dict[str, Any]:
    """
    Route URL to YouTube or general Web scraper
    """
    clean_url = url.strip()
    if "youtube.com" in clean_url or "youtu.be" in clean_url:
        return await ingest_youtube_url(clean_url)
    else:
        return await ingest_web_article(clean_url)
