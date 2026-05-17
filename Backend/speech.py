"""
Darija TTS (ElevenLabs) and STT (Groq Whisper via LiteLLM).

Usage from other backend modules:
    from speech import generate_darija_audio, transcribe_darija_voice, is_speech_configured

Env vars (in Backend/.env):
    ELEVENLABS_API_KEY
    ELEVENLABS_VOICE_ID          # optional; defaults to project custom voice
    GROQ_API_KEYS or GROQ_API_KEY # STT; same pool as rag_pipeline
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_VOICE_ID = "2QAiPfwOyvyh1iyFduOr"
TTS_MODEL_ID = "eleven_flash_v2_5"
STT_MODEL = "groq/whisper-large-v3-turbo"
STT_PROMPT = "Moroccan Darija, Maghrebi Arabic context."

_elevenlabs_client = None


def _groq_api_key() -> str:
    keys = os.environ.get("GROQ_API_KEYS", "")
    if keys.strip():
        return keys.split(",")[0].strip()
    return os.environ.get("GROQ_API_KEY", "").strip()


def is_tts_configured() -> bool:
    return bool(os.environ.get("ELEVENLABS_API_KEY", "").strip())


def is_stt_configured() -> bool:
    return bool(_groq_api_key())


def is_speech_configured() -> bool:
    return is_tts_configured() and is_stt_configured()


def _get_elevenlabs_client():
    global _elevenlabs_client
    from elevenlabs.client import ElevenLabs

    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    if _elevenlabs_client is None:
        _elevenlabs_client = ElevenLabs(api_key=api_key)
    return _elevenlabs_client


def _voice_id() -> str:
    return os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID).strip() or DEFAULT_VOICE_ID


def generate_darija_audio(
    text_to_speak: str,
    output_path: str | Path = "darija_output.mp3",
) -> Path | None:
    """
    TTS: Darija/Arabic script -> MP3 file (ElevenLabs Flash v2.5).
    Returns the output path on success, None on failure.
    """
    if not text_to_speak.strip():
        logger.warning("TTS skipped: empty text")
        return None

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        from elevenlabs import VoiceSettings

        client = _get_elevenlabs_client()
        response_stream = client.text_to_speech.convert(
            text=text_to_speak,
            voice_id=_voice_id(),
            model_id=TTS_MODEL_ID,
            voice_settings=VoiceSettings(
                stability=0.50,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True,
            ),
        )
        with open(out, "wb") as audio_file:
            for chunk in response_stream:
                if chunk:
                    audio_file.write(chunk)
        logger.info("TTS wrote audio to %s", out)
        return out
    except Exception as e:
        logger.error("TTS failed: %s", e)
        return None


def transcribe_darija_voice(audio_file_path: str | Path) -> str:
    """
    STT: audio file -> transcript text (Groq Whisper Large v3 Turbo).
    Returns empty string if transcription yields nothing; raises on missing file/config.
    """
    path = Path(audio_file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")

    api_key = _groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEYS or GROQ_API_KEY is not set")

    try:
        import litellm

        with open(path, "rb") as audio_file:
            response = litellm.transcription(
                model=STT_MODEL,
                file=audio_file,
                api_key=api_key,
                prompt=STT_PROMPT,
                temperature=0.0,
            )
        text = (response.get("text") or "").strip()
        logger.info("STT transcribed %s (%d chars)", path.name, len(text))
        return text
    except Exception as e:
        logger.error("STT failed for %s: %s", path, e)
        raise


def transcribe_darija_bytes(audio_bytes: bytes, filename: str = "voice.ogg") -> str:
    """STT from in-memory audio (e.g. Telegram voice download)."""
    import tempfile

    suffix = Path(filename).suffix or ".ogg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        return transcribe_darija_voice(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def generate_darija_audio_bytes(text_to_speak: str) -> bytes | None:
    """TTS -> MP3 bytes (for sendVoice / attachments without persisting)."""
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        result = generate_darija_audio(text_to_speak, tmp_path)
        if result is None:
            return None
        return result.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sample = (
        "خاصّك تقطّع الوراك لّي مراض وتحرَقهم باش المَرَض ما يتزادش فـ الشجرة كامْلة."
    )
    print("TTS configured:", is_tts_configured())
    print("STT configured:", is_stt_configured())
    if not is_speech_configured():
        print("Set ELEVENLABS_API_KEY and GROQ_API_KEYS in .env to run the pipeline test.")
        raise SystemExit(1)

    mp3 = generate_darija_audio(sample, "sandbox_output.mp3")
    if mp3:
        print("STT:", transcribe_darija_voice(mp3))
