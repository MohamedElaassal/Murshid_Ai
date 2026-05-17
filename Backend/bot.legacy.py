"""
╔══════════════════════════════════════════════════════════════════════╗
║              MOURCHID-AI — Agricultural Vision Bot                  ║
║              Hackathon MVP · Long-Polling · Single File             ║
╚══════════════════════════════════════════════════════════════════════╝

Stack:
  • pyTelegramBotAPI  — long-polling Telegram interface
  • LiteLLM           — Groq (llama-3.2-11b-vision) with 7-key round-robin
  • psycopg2          — local Docker PostgreSQL (no cloud, no IPv6 friction)

ENV VARS REQUIRED (export in your shell or add to a .env loader):
  TELEGRAM_BOT_TOKEN   — from @BotFather
  ADMIN_CHAT_ID        — your Telegram chat ID for /demo_checkin

  # Docker-local Postgres connection params (defaults match docker run command below)
  PG_HOST              — default: localhost
  PG_PORT              — default: 5432
  PG_DB                — default: mourchid
  PG_USER              — default: mourchid
  PG_PASSWORD          — set this explicitly (e.g. hackathon2025)
"""

# ── 0. SILENCE NOISY LOGGERS BEFORE ANY IMPORTS ──────────────────────────────
import logging
import sys
import os
import warnings

warnings.filterwarnings("ignore")

_SILENT_LOGGERS = [
    "litellm", "litellm.utils", "litellm.main", "litellm.router",
    "httpx", "httpcore", "urllib3", "urllib3.connectionpool",
    "openai", "openai._base_client",
]
for _name in _SILENT_LOGGERS:
    _l = logging.getLogger(_name)
    _l.setLevel(logging.CRITICAL)
    _l.propagate = False
    _l.handlers.clear()

# Swallow stderr during heavy lib imports
class _DevNull:
    def write(self, *a, **kw): pass
    def flush(self, *a, **kw): pass

_real_stderr = sys.stderr
sys.stderr = _DevNull()

# ── 1. STANDARD IMPORTS ───────────────────────────────────────────────────────
import uuid
import base64
import textwrap
import traceback
from pathlib import Path
from datetime import datetime

import litellm
import psycopg2
import psycopg2.extras
import telebot
from telebot.types import Message


sys.stderr = _real_stderr   # restore

# Re-apply logger silence post-import (libs register handlers at import time)
for _name in _SILENT_LOGGERS:
    _l = logging.getLogger(_name)
    _l.setLevel(logging.CRITICAL)
    _l.propagate = False
    _l.handlers.clear()

# ── 2. CONFIGURATION ──────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ADMIN_CHAT_ID      = int(os.environ.get("ADMIN_CHAT_ID", "0"))

# ── Local Docker PostgreSQL — discrete DSN params (no URL parsing needed) ────
PG_HOST     = os.environ.get("PG_HOST",     "localhost")
PG_PORT     = int(os.environ.get("PG_PORT", "5432"))
PG_DB       = os.environ.get("PG_DB",       "mourchid")
PG_USER     = os.environ.get("PG_USER",     "mourchid")
PG_PASSWORD = os.environ["PG_PASSWORD"]     # required — no default for secrets

# ── Groq API key pool — rotated automatically to avoid per-key rate limits ───
import itertools
GROQ_API_KEYS = []
_groq_key_cycle = itertools.cycle(GROQ_API_KEYS)

def _next_groq_key() -> str:
    """Return the next Groq API key in the rotation."""
    return next(_groq_key_cycle)

TEMP_IMAGE_DIR = Path("./tmp_images")
TEMP_IMAGE_DIR.mkdir(exist_ok=True)

# ── 3. LOGGING (only our custom prints hit the console) ───────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("mourchid")

# ── 4. DATABASE LAYER ─────────────────────────────────────────────────────────

def _get_conn():
    """
    Return a fresh psycopg2 connection to the local Docker Postgres instance.
    Uses discrete keyword args — no URL string to parse, no SSL/IPv6 negotiation.
    RealDictCursor ensures every fetchone() returns a plain dict keyed by column
    name, so all downstream report["field"] accesses map cleanly.
    """
    return psycopg2.connect(
        host            = PG_HOST,
        port            = PG_PORT,
        dbname          = PG_DB,
        user            = PG_USER,
        password        = PG_PASSWORD,
        cursor_factory  = psycopg2.extras.RealDictCursor,
        connect_timeout = 5,   # fail fast on stage if Docker is not up
    )


def db_insert_report(
    chat_id: str,
    crop_type: str,
    detected_disease: str,
    prescribed_chemical: str,
) -> str:
    """Insert a new OPEN report and return the generated report_id (UUID)."""
    report_id = str(uuid.uuid4())
    sql = """
        INSERT INTO reports
            (report_id, telegram_chat_id, crop_type, detected_disease,
             prescribed_chemical, status)
        VALUES
            (%s, %s, %s, %s, %s, 'OPEN')
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (report_id, chat_id, crop_type, detected_disease, prescribed_chemical))
        conn.commit()
    return report_id


def db_get_latest_open(chat_id: str) -> dict | None:
    """Fetch the most recent OPEN report for this chat_id."""
    sql = """
        SELECT * FROM reports
        WHERE telegram_chat_id = %s AND status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 1
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (chat_id,))
            return cur.fetchone()


def db_close_report(report_id: str, feedback: str, success: bool) -> None:
    """Write farmer feedback and flip the report status."""
    new_status = "CLOSED_SUCCESS" if success else "CLOSED_FAILED"
    sql = """
        UPDATE reports
        SET farmer_feedback = %s,
            status          = %s,
            updated_at      = NOW()
        WHERE report_id = %s
    """
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (feedback, new_status, report_id))
        conn.commit()


# ── 5. VISION AGENT (direct Groq API — no smolagents overhead) ───────────────

_VISION_PROMPT = """أنت خبير في الزراعة والأمراض النباتية. جاوب فقط بالدارجة المغربية مكتوبة بالحروف العربية.
ما تستعملش الفصحى، ما تستعملش الفرنسية، وما تكتبش بالحروف اللاتينية.
ما تدير حتى markdown (ما تستعملش * أو #)، وما تطرحش أسئلة في الأخير.
الأعداد خاصك تكتبها بالكلمات ما تكتبهاش بالأرقام.

حلل هاد الصورة وخرج لي الجواب داخل هاد الـ tags XML بهاد الترتيب بالضبط:

<crop>سمية المنتوج أو الزراعة بالدارجة بالعربية</crop>
<disease>سمية المرض أو المشكل بالدارجة بالعربية</disease>
<treatment>خطة العلاج بالدارجة البسيطة جاهزة للقراءة الصوتية، الأعداد بالكلمات</treatment>

مثال على أسلوب الجواب:
<crop>التفاح</crop>
<disease>الميدو (البياض الدقيقي)</disease>
<treatment>خاصك تقطع الوراك اللي مراض وفيهم ديك الغبرة البيضاء وتحرقهم باش ما يتزادش المرض. من بعد رش الشجرة بشي دوا فيه الكوفر وماتكترش من الما فالسقي. دير هادشي فالعشية ملي تبرد الشمش.</treatment>"""


def analyse_crop_image(image_path: str) -> dict:
    """
    Call Groq vision API directly with the image — no smolagents, no tool loop.
    Returns: {"crop_type": str, "disease": str, "treatment_plan": str}
    """
    import re as _re

    # Encode image to base64
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    # Detect mime type from extension
    ext = Path(image_path).suffix.lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text",      "text": _VISION_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }
    ]

    sys.stderr = _DevNull()
    try:
        resp = litellm.completion(
            model    = "groq/meta-llama/llama-4-scout-17b-16e-instruct",
            api_key  = _next_groq_key(),
            messages = messages,
        )
        raw = resp.choices[0].message.content or ""
    finally:
        sys.stderr = _real_stderr

    # Parse XML tags — re.DOTALL handles multi-line treatment blocks
    def _extract_xml(tag: str, text: str) -> str:
        m = _re.search(rf"<{tag}>(.*?)</{tag}>", text, _re.DOTALL)
        return m.group(1).strip() if m else "غير محدد"

    crop_type      = _extract_xml("crop",      raw)
    disease        = _extract_xml("disease",   raw)
    treatment_plan = _extract_xml("treatment", raw)

    # Full-output fallback if XML tags were missing entirely
    if treatment_plan == "غير محدد" and len(raw) > 40:
        treatment_plan = raw.strip()

    return {
        "crop_type":      crop_type,
        "disease":        disease,
        "treatment_plan": treatment_plan,
    }


# ── 6. FEEDBACK CLASSIFIER ────────────────────────────────────────────────────
_SUCCESS_SIGNALS = {
    "1", "نجح", "worked", "mcha", "msha", "zwina", "khdam", "khdm",
    "ok", "okay", "yes", "iyeh", "ah", "bslama", "shukran", "merci",
    "3jbni", "perfect", "bghit", "tayyeb", "tayb",
}
_FAILURE_SIGNALS = {
    "2", "failed", "ma mchach", "mamchach", "khassar", "ma khdmch",
    "no", "la", "mzyan", "3afan", "problem", "mochkil", "khayb",
    "ma7abch", "worst",
}

def classify_feedback(text: str) -> bool | None:
    """
    Returns True = success, False = failure, None = unclear.
    """
    t = text.lower().strip()
    if any(sig in t for sig in _SUCCESS_SIGNALS):
        return True
    if any(sig in t for sig in _FAILURE_SIGNALS):
        return False
    return None   # ambiguous — store as-is, default to CLOSED_SUCCESS


# ── 7. TELEGRAM BOT ───────────────────────────────────────────────────────────
bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN, parse_mode=None)


# ── /start ────────────────────────────────────────────────────────────────────
@bot.message_handler(commands=["start"])
def handle_start(msg: Message):
    bot.send_message(
        msg.chat.id,
        "Mrhba bik f Mourchid-AI. Sifet liya tiswra dyal zzra3a dyalek u ghadi n3tik "
        "tashkhis u khotta d 3ilaj f Darija. Ma3ndkch ghir tsifet sura."
    )
    log.info("✅ /start — chat_id=%s", msg.chat.id)


# ── PHOTO HANDLER ─────────────────────────────────────────────────────────────
@bot.message_handler(content_types=["photo"])
def handle_photo(msg: Message):
    chat_id = str(msg.chat.id)
    log.info("📸 Photo received — chat_id=%s", chat_id)

    # Acknowledge immediately (TTS-friendly Darija, no markdown)
    bot.send_message(
        chat_id,
        "Waslt ssuret dyalek. Katkhdem 3liha daba, sber chwiya."
    )

    # ── Download the highest-resolution photo ─────────────────────────────
    photo     = msg.photo[-1]
    file_info = bot.get_file(photo.file_id)
    raw_bytes = bot.download_file(file_info.file_path)

    image_path = TEMP_IMAGE_DIR / f"{chat_id}_{photo.file_id}.jpg"
    image_path.write_bytes(raw_bytes)
    log.info("💾 Image saved → %s", image_path)

    # ── Run vision agent ──────────────────────────────────────────────────
    try:
        result = analyse_crop_image(str(image_path))
    except Exception as exc:
        log.error("❌ Vision agent error: %s", exc)
        bot.send_message(
            chat_id,
            "3afak 3awed sifet sura okhra. Kan 3endi mochkil f ttahlil dyal had sura."
        )
        return

    # ── Persist to DB ─────────────────────────────────────────────────────
    try:
        report_id = db_insert_report(
            chat_id          = chat_id,
            crop_type        = result["crop_type"],
            detected_disease = result["disease"],
            prescribed_chemical = result["treatment_plan"],
        )
        log.info("✅ DB INSERT — report_id=%s  crop=%s  disease=%s",
                 report_id, result["crop_type"], result["disease"])
    except Exception as exc:
        log.error("❌ DB INSERT failed: %s", exc)
        report_id = "N/A"

    # ── Reply to farmer ───────────────────────────────────────────────────
    farmer_reply = (
        f"Tashkhis dyalna: {result['crop_type']} — {result['disease']}.\n\n"
        f"{result['treatment_plan']}\n\n"
        "Mn b3d ma t3mel had lkhotta, wa7ed u 3ochrin sa3a, "
        "khberni wash khdmat m3ak: kteb wahd ila kan mzyan, "
        "u jouj ila ma mchach."
    )
    bot.send_message(chat_id, farmer_reply)
    log.info("💬 Reply sent — chat_id=%s  report_id=%s", chat_id, report_id)

    # Clean up temp file
    try:
        image_path.unlink()
    except Exception:
        pass


# ── TEXT / FEEDBACK HANDLER ───────────────────────────────────────────────────
@bot.message_handler(func=lambda m: m.text and not m.text.startswith("/"))
def handle_text(msg: Message):
    chat_id = str(msg.chat.id)
    text    = msg.text.strip()
    log.info("💬 Text received — chat_id=%s  text=%r", chat_id, text)

    # ── Look up latest OPEN report ─────────────────────────────────────────
    try:
        report = db_get_latest_open(chat_id)
    except Exception as exc:
        log.error("❌ DB SELECT failed: %s", exc)
        bot.send_message(chat_id, "3afak 3awed men b3d, kan 3endi mochkil f lqra3a.")
        return

    if not report:
        bot.send_message(
            chat_id,
            "Ma 3ndkch rapport meftuh daba. Sifet sura dyal zzra3a dyalek bach nbdaw."
        )
        return

    # ── Classify feedback ──────────────────────────────────────────────────
    success   = classify_feedback(text)
    is_success = success if success is not None else True   # default optimistic

    try:
        db_close_report(
            report_id = report["report_id"],
            feedback  = text,
            success   = is_success,
        )
        status_label = "CLOSED_SUCCESS" if is_success else "CLOSED_FAILED"
        log.info(
            "📊 FEEDBACK SAVED — report_id=%s  chat_id=%s  status=%s  "
            "crop=%s  disease=%s  feedback=%r  → DATASET READY FOR FINE-TUNE",
            report["report_id"], chat_id, status_label,
            report["crop_type"], report["detected_disease"], text,
        )
    except Exception as exc:
        log.error("❌ DB UPDATE failed: %s", exc)
        bot.send_message(chat_id, "Ma qderch nsjel lji3ane. 3awed mn b3d.")
        return

    # ── Reply to farmer ────────────────────────────────────────────────────
    if is_success:
        bot.send_message(
            chat_id,
            "Mzyan bzzaf, ferhna bhal ma 3mlat lkhotta. "
            "Sjlna had lma3louma bach ntay7du l5idma dyalna. "
            "Ila 3ndek chi so2al akhor, sifet sura okhra."
        )
    else:
        bot.send_message(
            chat_id,
            "Mta2ssifin 3la had lmochkil. "
            "Sjlna had lji3ane bach n7snu lkhidma dyalna. "
            "Sifet sura okhra aw tqder ttslu b 5bire d zra3a mn lmantiqa dyalek."
        )


# ── /demo_checkin — ADMIN DEMO TRIGGER ───────────────────────────────────────
@bot.message_handler(commands=["demo_checkin"])
def handle_demo_checkin(msg: Message):
    """
    Admin-only command to force a follow-up message to a target chat_id.
    Usage: /demo_checkin <target_chat_id>   (defaults to ADMIN_CHAT_ID)

    Demonstrates the feedback loop live on stage without waiting for real data.
    """
    if msg.chat.id != ADMIN_CHAT_ID:
        log.warning("⚠️  Unauthorized /demo_checkin attempt from chat_id=%s", msg.chat.id)
        return   # silently ignore non-admin calls

    parts = msg.text.split()
    target_chat_id = int(parts[1]) if len(parts) > 1 else ADMIN_CHAT_ID

    demo_message = (
        "Salam sahbi, Mourchid-AI hna. "
        "3 iyam dat 3la lkhotta dyal l3ilaj. "
        "Khberna wash had lkhotta n9bat m3ak: "
        "kteb wahd ila kan mzyan, u jouj ila ma mchach."
    )
    try:
        bot.send_message(target_chat_id, demo_message)
        log.info("🚀 DEMO CHECK-IN sent → chat_id=%s (triggered by admin=%s)",
                 target_chat_id, msg.chat.id)
        bot.send_message(
            msg.chat.id,
            f"Demo check-in sent successfully to chat_id {target_chat_id}."
        )
    except Exception as exc:
        log.error("❌ Demo send failed: %s", exc)
        bot.send_message(msg.chat.id, f"Failed to send demo message: {exc}")


# ── /status — quick health check ─────────────────────────────────────────────
@bot.message_handler(commands=["status"])
def handle_status(msg: Message):
    if msg.chat.id != ADMIN_CHAT_ID:
        return
    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS total, status FROM reports GROUP BY status")
                rows = cur.fetchall()
        lines = [f"  {r['status']}: {r['total']}" for r in rows]
        summary = "DB Status:\n" + "\n".join(lines) if lines else "DB Status: no reports yet."
    except Exception as exc:
        summary = f"DB error: {exc}"
    bot.send_message(msg.chat.id, summary)
    log.info("📊 /status — %s", summary.replace("\n", " | "))


# ── 8. ENTRYPOINT ─────────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════
# QUICKSTART — LOCAL DOCKER POSTGRES SETUP
# ══════════════════════════════════════════════════════════════════════════════
#
# STEP 1 — Pull and run the official Postgres container
# (run once; the container auto-restarts unless you stop it explicitly)
#
#   docker pull postgres:16
#
#   docker run -d \
#     --name mourchid-db \
#     -e POSTGRES_DB=mourchid \
#     -e POSTGRES_USER=mourchid \
#     -e POSTGRES_PASSWORD=hackathon2025 \
#     -p 5432:5432 \
#     --restart unless-stopped \
#     postgres:16
#
# STEP 2 — Create the reports table (run once)
#
#   docker exec -i mourchid-db psql -U mourchid -d mourchid <<SQL
#   CREATE TABLE IF NOT EXISTS reports (
#       report_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
#       telegram_chat_id    VARCHAR(32)   NOT NULL,
#       crop_type           VARCHAR(128),
#       detected_disease    VARCHAR(256),
#       prescribed_chemical TEXT,
#       farmer_feedback     TEXT,
#       status              VARCHAR(20)   NOT NULL DEFAULT 'OPEN'
#                               CHECK (status IN ('OPEN','CLOSED_SUCCESS','CLOSED_FAILED')),
#       created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
#       updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
#   );
#   CREATE INDEX IF NOT EXISTS idx_reports_chat_status
#       ON reports (telegram_chat_id, status, created_at DESC);
#   SQL
#
# STEP 3 — Export environment variables and start the bot
#
#   export TELEGRAM_BOT_TOKEN="7xxxxxxxxx:AAF..."   # required
#   # GEMINI key no longer needed — Groq keys are hardcoded in the pool above
#   export ADMIN_CHAT_ID="123456789"                # required
#   export PG_PASSWORD="hackathon2025"              # required
#
#   # PG_HOST / PG_PORT / PG_DB / PG_USER are optional — defaults already
#   # match the docker run command above, so skip them unless you customised.
#
#   python bot.py
#
# STEP 4 — Verify DB is receiving data (optional sanity check)
#
#   docker exec -it mourchid-db psql -U mourchid -d mourchid \
#     -c "SELECT report_id, crop_type, status, created_at FROM reports ORDER BY created_at DESC LIMIT 5;"
#
# STEP 5 — On-stage demo flow
#   a. Send any crop photo to the bot → instant Darija diagnosis
#   b. Farmer replies "1" → CLOSED_SUCCESS  /  "2" → CLOSED_FAILED
#   c. Admin sends: /demo_checkin <farmer_chat_id>   (triggers live follow-up)
#   d. Admin sends: /status                          (shows DB row counts)
#
# CONTAINER MANAGEMENT (useful commands)
#   docker stop mourchid-db      # pause between sessions
#   docker start mourchid-db     # resume — data persists in the volume
#   docker rm -f mourchid-db     # full reset (drops all data)
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("🌿 MOURCHID-AI BOT STARTING")
    log.info("=" * 60)
    log.info("✅ Long-polling active — no webhook needed")
    log.info("✅ Admin chat_id: %s", ADMIN_CHAT_ID)
    log.info("✅ Groq key pool: %d keys loaded", len(GROQ_API_KEYS))

    # Verify DB connectivity at startup
    try:
        with _get_conn() as conn:
            conn.cursor().execute("SELECT 1")
        log.info(
            "✅ Local Docker PostgreSQL connection OK — %s@%s:%s/%s",
            PG_USER, PG_HOST, PG_PORT, PG_DB,
        )
    except Exception as exc:
        log.error(
            "❌ DB connection FAILED: %s — is Docker running? "
            "Check PG_HOST/PG_PORT/PG_DB/PG_USER/PG_PASSWORD env vars.",
            exc,
        )

    bot.infinity_polling(
        timeout        = 20,
        long_polling_timeout = 10,
        logger_level   = logging.CRITICAL,   # suppress telebot's own poll logs
        allowed_updates= ["message"],
    )