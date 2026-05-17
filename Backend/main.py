import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI, BackgroundTasks, Request, Depends
from sqlalchemy.orm import Session
from models import init_db, get_db, Report
from vision import analyse_crop_image
from rag_pipeline import get_rag_treatment
from utils import classify_feedback
from speech import (
    generate_darija_audio_bytes,
    transcribe_darija_bytes,
    is_tts_configured,
    is_stt_configured,
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mourchid-AI Webhook Node")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Database initialized.")

async def send_telegram_message(chat_id: str, text: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text}
        )


async def send_telegram_voice(chat_id: str, audio_bytes: bytes):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{TELEGRAM_API_URL}/sendVoice",
            data={"chat_id": chat_id},
            files={"voice": ("reply.mp3", audio_bytes, "audio/mpeg")},
        )


async def send_farmer_reply(chat_id: str, text: str):
    """Text reply; adds Darija voice note when ElevenLabs is configured."""
    await send_telegram_message(chat_id, text)
    if not is_tts_configured():
        return
    try:
        audio = await asyncio.to_thread(generate_darija_audio_bytes, text)
        if audio:
            await send_telegram_voice(chat_id, audio)
    except Exception as e:
        logger.warning("TTS voice note skipped: %s", e)


async def download_telegram_file(file_id: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient() as client:
        file_resp = await client.get(f"{TELEGRAM_API_URL}/getFile?file_id={file_id}")
        file_data = file_resp.json()
        if not file_data.get("ok"):
            raise RuntimeError("Failed to get file from Telegram")
        file_path = file_data["result"]["file_path"]
        file_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
        file_bytes = (await client.get(file_url)).content
        return file_bytes, file_path


async def process_photo_update(chat_id: str, photo_array: list, db: Session):
    # Get highest resolution photo (last in array)
    file_id = photo_array[-1]["file_id"]
    try:
        img_bytes, file_path = await download_telegram_file(file_id)
    except Exception as e:
        logger.error("Failed to download photo: %s", e)
        return

    # Send processing message
    await send_telegram_message(chat_id, "Waslt ssuret dyalek. Katkhdem 3liha daba, sber chwiya.")
    
    # 1. Vision Engine
    mime_type = "image/png" if file_path.endswith(".png") else "image/jpeg"
    try:
        vision_result = await analyse_crop_image(img_bytes, mime_type)
    except Exception as e:
        logger.error(f"Vision engine error: {e}")
        await send_telegram_message(chat_id, "3afak 3awed sifet sura okhra. Kan 3endi mochkil f ttahlil dyal had sura.")
        return

    # Check for confidence and human escalation
    status = "OPEN"
    if vision_result.confidence < 0.80:
        status = "HUMAN_ESCALATION"
        treatment = vision_result.treatment_plan # Keep base treatment but wait for human
    else:
        # 2. RAG Pipeline
        treatment = await get_rag_treatment(vision_result.raw_class_name)
        
    # 3. Store in DB
    new_report = Report(
        telegram_chat_id=chat_id,
        crop_type=vision_result.crop_type,
        detected_disease=vision_result.disease_name,
        prescribed_chemical=treatment,
        status=status,
        confidence_score=vision_result.confidence
    )
    db.add(new_report)
    db.commit()
    
    # 4. Reply
    farmer_reply = (
        f"Tashkhis dyalna: {vision_result.crop_type} — {vision_result.disease_name}.\n\n"
        f"{treatment}\n\n"
        "Mn b3d ma t3mel had lkhotta, wa7ed u 3ochrin sa3a, "
        "khberni wash khdmat m3ak: kteb wahd ila kan mzyan, "
        "u jouj ila ma mchach."
    )
    
    if status == "HUMAN_ESCALATION":
        farmer_reply = "الصورة ما واضحاش مزيان (الثقة أقل من 80٪). دوزنا الطلب ديالك لمهندس زراعي باش يراجعو. فانتظار الجواب، هاهي الخطة المبدئية:\n" + farmer_reply

    await send_farmer_reply(chat_id, farmer_reply)


async def process_voice_update(chat_id: str, file_id: str, db: Session):
    if not is_stt_configured():
        await send_telegram_message(
            chat_id,
            "Ma 9derch nfhem l-voice daba. Kteb 1 ila khdmat lkhotta, u 2 ila ma mchach.",
        )
        return
    try:
        audio_bytes, file_path = await download_telegram_file(file_id)
        transcript = await asyncio.to_thread(
            transcribe_darija_bytes, audio_bytes, file_path
        )
    except Exception as e:
        logger.error("Voice transcription failed: %s", e)
        await send_telegram_message(
            chat_id,
            "Ma fhemtch l-voice. 3afak 3awed kteb 1 aw 2, aw sifet voice okhra.",
        )
        return
    if not transcript.strip():
        await send_telegram_message(
            chat_id,
            "Ma fhemtch l-voice. 3afak kteb 1 ila mzyan, u 2 ila la.",
        )
        return
    await process_text_update(chat_id, transcript, db)


async def process_text_update(chat_id: str, text: str, db: Session):
    # Find latest open report
    report = db.query(Report).filter(
        Report.telegram_chat_id == chat_id,
        Report.status == "OPEN"
    ).order_by(Report.created_at.desc()).first()
    
    if not report:
        await send_telegram_message(chat_id, "Ma 3ndkch rapport meftuh daba. Sifet sura dyal zzra3a dyalek bach nbdaw.")
        return
        
    success = classify_feedback(text)
    is_success = success if success is not None else True

    report.farmer_feedback = text
    report.status = "CLOSED_SUCCESS" if is_success else "CLOSED_FAILED"
    db.commit()
    
    if is_success:
        reply = "Mzyan bzzaf, ferhna bhal ma 3mlat lkhotta. Sjlna had lma3louma bach ntay7du l5idma dyalna. Ila 3ndek chi so2al akhor, sifet sura okhra."
    else:
        reply = "Mta2ssifin 3la had lmochkil. Sjlna had lji3ane bach n7snu lkhidma dyalna. Sifet sura okhra aw tqder ttslu b 5bire d zra3a mn lmantiqa dyalek."
        
    await send_farmer_reply(chat_id, reply)


@app.post("/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    update = await request.json()
    
    if "message" in update:
        message = update["message"]
        chat_id = str(message["chat"]["id"])
        
        # Ignore commands like /start
        if "text" in message and message["text"].startswith("/"):
            if message["text"].startswith("/start"):
                background_tasks.add_task(
                    send_telegram_message, 
                    chat_id, 
                    "Mrhba bik f Mourchid-AI. Sifet liya tiswra dyal zzra3a dyalek "
                    "u ghadi n3tik tashkhis u khotta d 3ilaj f Darija (text u voice). "
                    "Mn b3d l3ilaj, kteb 1/2 aw sifet voice."
                )
            return {"status": "ok"}

        if "photo" in message:
            background_tasks.add_task(process_photo_update, chat_id, message["photo"], db)

        elif "voice" in message:
            background_tasks.add_task(
                process_voice_update, chat_id, message["voice"]["file_id"], db
            )

        elif "text" in message:
            background_tasks.add_task(process_text_update, chat_id, message["text"], db)

    return {"status": "ok"}

# To test:
# uvicorn main:app --reload
