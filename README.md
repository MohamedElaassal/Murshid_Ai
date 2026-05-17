# 🇲🇦 Mourchid-AI: The Moroccan Way to Agricultural Triage 🌾

<div align="center">
  <h2>ⵣ Marhaba (Welcome) ⵣ</h2>
  <p><i>An advanced, event-driven, AI-powered epidemiological radar built for Moroccan agriculture.</i></p>
</div>

---

## 🌍 The Vision

Mourchid-AI transforms agricultural advisory from slow, localized guesswork into a real-time, nation-wide response network. By digitizing the traditional farming workflow without requiring farmers to change their habits, we provide the ONCA (Office National du Conseil Agricole) and the Ministry of Agriculture with an unprecedented, live heatmap of crop diseases.

## 🚀 Key Features & Innovations

We have significantly upgraded our architecture to be highly scalable, data-driven, and hyper-localized to the Moroccan context:

- **Hyper-Localized ONSSA RAG**: Our model doesn't just guess generic treatments. It cross-references the official **ONSSA Index Phytosanitaire** using an advanced RAG (Retrieval-Augmented Generation) pipeline to prescribe exact, legal, and safe chemical solutions available in Morocco.
- **Multimodal Interactions (Image & Voice)**: Farmers can simply send a photo of a diseased leaf and a **voice note** explaining the symptoms via WhatsApp/Telegram. The AI processes both visual and audio inputs, responding in simple Moroccan Darija or Tashelhit.
- **Continuous Feedback Loop**: Mourchid-AI asks farmers for feedback ("Did the treatment work?"). This data is fed back into the model to dynamically update treatment efficacy weights.
- **Epidemiological Radar**: Every interaction is geolocated and streamed to a real-time Streamlit dashboard, creating a live heatmap of disease outbreaks across the country for government officials.

---

## 🏗️ System Architecture

This project is built using a modern, decoupled, event-driven architecture designed to handle thousands of concurrent interactions during a national disease outbreak.

1. **Ingestion Layer (FastAPI & Webhooks)**: 
   - A high-performance async FastAPI hub receives JSON payloads (Voice, Images, GPS) from Telegram/WhatsApp webhooks.
2. **Perception Engine (Vision & Audio)**: 
   - Images are processed via Vision LLMs (e.g., Gemini 1.5 Flash / GPT-4o).
   - Voice notes are transcribed to text to gather additional symptom context.
3. **The Knowledge Base (RAG Pipeline)**:
   - Built with `FAISS` and `text-embedding-3-small`.
   - Chunks and searches the ONSSA database to generate context-grounded responses.
4. **Data Orchestration (Kafka & Airflow)**:
   - **Kafka** acts as the streaming backbone, ingesting reports to prevent database lockups.
   - **Airflow** handles scheduled jobs, such as triggering the follow-up feedback loop with farmers 14 days after their initial query.
5. **Command Center (Streamlit)**:
   - A live dashboard visualizing `PostgreSQL/SQLite` data via `Folium` heatmaps.

---

## 💻 Installation & Setup Guide

### Prerequisites
- Python 3.10+
- Docker & Docker Compose (for Kafka & Databases)
- Telegram/WhatsApp Bot Token
- OpenAI / Gemini API Keys

### 1. Clone & Environment Setup

```bash
git clone https://github.com/your-repo/mourchid-ai.git
cd mourchid-ai

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (ensure you have a requirements.txt defined)
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
TELEGRAM_BOT_TOKEN="your_bot_token"
OPENAI_API_KEY="your_openai_key"
GEMINI_API_KEY="your_gemini_key"
DATABASE_URL="sqlite:///./mourchid.db" # or PostgreSQL URL
KAFKA_BROKER_URL="localhost:9092"
```

### 3. Initialize the RAG Knowledge Base

Before running the server, you must embed the ONSSA documents into the local vector store:

```bash
# This script should parse your ONSSA PDFs and build the FAISS index
python scripts/build_vector_store.py
```

### 4. Start Infrastructure (Kafka & DB)

If you are using the advanced orchestration layer, spin up your Docker containers:

```bash
docker-compose up -d
```

### 5. Start the Services

You need to run the services in parallel. Open separate terminal windows:

**Terminal 1: FastAPI Webhook Hub**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2: Kafka Consumer Worker**
```bash
python workers/db_writer.py
```

**Terminal 3: Streamlit Command Center**
```bash
streamlit run app.py
```

### 6. Set the Webhook

Register your local (using ngrok) or production URL with Telegram:
```bash
curl -F "url=https://your-ngrok-url.app/webhook" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

---

## 🤝 Contributing

We enforce clean API contracts and strict data typing. All new data models must be defined in `schemas.py` using **Pydantic** before being integrated into the pipeline. If you're modifying the Airflow DAGs, test them locally before pushing.

---

## 🙏 Acknowledgments & Big Thanks

**A massive thank you to HackAI 4.0 for hosting this incredible hackathon!** 🎉
This project would not have been possible without the amazing environment, the mentors, and the relentless energy of the HackAI community. 🇲🇦❤️
