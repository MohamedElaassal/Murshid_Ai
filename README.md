# 🌱 Mourchid-AI

> **Moroccan Agricultural AI Assistant** — Hackathon Project
> 
> An AI-powered Telegram bot that helps Moroccan farmers diagnose crop diseases and get treatment recommendations — all in Darija (Moroccan Arabic).

[![Made with ❤️ in Morocco](./assets/made-in-ma.svg)](https://github.com/mourchid-ai)
[![Python](https://img.shields.io/badge/Python-3.12+-blue?logo=python)](https://python.org)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-2CA5E0?logo=telegram)](https://core.telegram.org)
[![Groq](https://img.shields.io/badge/Groq-Llama--4-Scout-FF6F00?logo=groq)](https://groq.com)

---

## 🎯 What is Mourchid-AI?

Mourchid-AI is a voice-first agricultural assistant designed for smallholder farmers in Morocco. 

**How it works:**

1. **📸 Farmer sends a photo** of their sick crop
2. **🤖 AI analyzes the image** using Groq's vision model
3. **💬 Returns diagnosis + treatment** in Darija (text + optional voice note)
4. **📞 Farmer confirms** if the treatment worked (1 = yes, 2 = no)
5. **🔄 Feedback loop** improves the model for future predictions

**Supported interactions:**
- 📷 Photo upload (crop disease diagnosis)
- 🎤 Voice notes (hands-free feedback)
- 💬 Text responses (1/2 or yes/no)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM                         │
│                   (User Interface)                    │
└─────────────────────┬─────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                         │
   ┌────▼────┐            ┌─────▼─────┐
   │ bot.py  │            │ main.py   │
   │ (Long-  │            │ (Webhook) │
   │ polling)│            │ (FastAPI) │
   └────┬────┘            └─────┬─────┘
        │                         │
        └───────────┬─────────────┘
                    │
          ┌─────────▼─────────┐
          │   VISION ENGINE   │
          │ (Groq Llama Vision)│
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │  RAG PIPELINE    │
          │ (Treatment DB)   │
          └─────────┬─────────┘
                    │
          ┌─────────▼─────────┐
          │   DATABASE      │
          │ (SQLite/Postgres)│
          └─────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|-------------|
| **Bot Interface** | pyTelegramBotAPI / FastAPI |
| **Vision AI** | Groq (Llama-4-Scout-17B) |
| **TTS/STT** | ElevenLabs (optional) |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Dashboard** | Laravel + React |
| **Language** | Python 3.12+ |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Telegram Bot Token ([get from @BotFather](https://t.me/BotFather))
- Groq API Key ([get from groq.com](https://groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-org/mourchid-ai.git
cd mourchid-ai/Backend
cp .env.example .env
# Edit .env with your API keys
```

### 2. Configure Environment

```bash
# .env file
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_chat_id
GROQ_API_KEY=your_groq_key
# Optional (for voice notes)
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 3. Run the Bot

**Option A: Long-Polling (development)**
```bash
python bot.py
```

**Option B: Webhook (production)**
```bash
uvicorn main:app --host 0.0.0.0 --port 443
# Set webhook: curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/webhook"
```

### 4. Test It

1. Open your bot on Telegram
2. Send `/start` to get the welcome message
3. Send a photo of a sick plant
4. Get your diagnosis in Darija! 🌿

---

## 📁 Project Structure

```
mourchid-ai/
├── Backend/
│   ├── bot.py           # Long-polling Telegram bot
│   ├── main.py         # FastAPI webhook server
│   ├── models.py       # SQLAlchemy models
│   ├── schemas.py     # Pydantic schemas
│   ├── vision.py      # Vision AI integration
│   ├── rag_pipeline.py # Treatment recommendations
│   ├── speech.py      # TTS/STT (ElevenLabs)
│   ├── utils.py       # Utilities
│   └── mourchid.db   # SQLite database
│
├── Dashboard/
│   ├── app/          # Laravel application
│   ├── resources/   # React/Vue assets
│   └── database/    # Migrations
│
└── README.md
```

---

## 💬 Language & Voice

All responses are in **Darija** (Moroccan Arabic) written in **Arabic script**:

```
✅ Correct:
<crop>التفاح</crop>
<disease>الميدو (البياض الدقيقي)</disease>
<treatment>رش الشجرة بكاس الكوفر...</treatment>

❌ Avoid:
- French words (unless necessary)
- Latin script (العربية فقط!)
- Markdown formatting (*, #)
- Numbers (use words: "wahd", "jouj", "talata")
```

---

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/status` | Admin: DB health check |
| `/demo_checkin` | Admin: Force follow-up |

---

## 📊 Feedback System

Farmers confirm treatment success with:

- **1 / نجح / yes** → Success → `CLOSED_SUCCESS`
- **2 / failed / no** → Failure → `CLOSED_FAILED`

This feedback is stored for future model fine-tuning.

---

## 🛠️ Development

### Running Tests

```bash
# Backend tests
cd Backend
pytest

# Dashboard tests
cd Dashboard
php artisan test
```

### Database

**SQLite (development):**
```bash
# Already initialized on first run
ls -la mourchid.db
```

**PostgreSQL (production):**
```bash
docker run -d \
  --name mourchid-db \
  -e POSTGRES_DB=mourchid \
  -e POSTGRES_USER=mourchid \
  -e POSTGRES_PASSWORD=hackathon2025 \
  -p 5432:5432 \
  postgres:16
```

---

## 🏆 Hackathon Notes

This project was built during a **72-hour hackathon** with:

- ⏰ Time constraints → Single-file bot architecture
- 🌾 Real farmers → Darija-only responses
- 📱 Offline? → Works with minimal connectivity
- 💰 Free tier → Groq API with key rotation
- 🐛 No bugs → Extensive error handling

**Key decisions:**
- Long-polling for reliability over webhooks
- SQLite for zero-setup development
- Vision-first (no complex UI)
- Voice notes for accessibility

---

## 📄 License

MIT License — Made with ❤️ for Moroccan farmers.

---

## 🤝 Contributing

PRs welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

---

## 🔗 Links

- [Telegram Bot](https://t.me/your_bot_here)
- [Demo Video](./assets/demo.mp4)
- [Presentation](./assets/slides.pdf)

---

<div align="center">

**🌱 Mourchid-AI — AI for Moroccan Agriculture**

*Built at [HackAI 2025]*

</div>