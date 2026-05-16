This is the level of engineering that separates a standard hackathon project from a winning, production-ready architecture. To build a robust system in 48 hours, you need precise data models, clean API contracts, and a modular pipeline so your team can work in parallel.

Here is the deep-dive technical implementation for the **Mourchid-AI** backend, structured to leverage high-performance data engineering and AI agent workflows.

---

### 1. Database Schema & Models (Pydantic & SQLite)

Using `SQLAlchemy` and `Pydantic` ensures your data is strictly typed as it flows from the Telegram webhook to the database and out to the Streamlit dashboard.

**Data Model (`models.py`):**

* `id`: String, Primary Key (UUID)
* `chat_id`: String (Telegram user ID)
* `timestamp`: DateTime (UTC)
* `latitude`: Float (Nullable)
* `longitude`: Float (Nullable)
* `crop_type`: String
* `disease_detected`: String
* `treatment_advised`: String
* `confidence_score`: Float
* `status`: String (e.g., 'CLOSED', 'HUMAN_ESCALATION')

**Pydantic Schema for Vision Output (`schemas.py`):**
Defining this schema forces the Vision LLM to return strictly formatted JSON, preventing parsing errors.

```python
class VisionExtraction(BaseModel):
    crop_type: str
    disease_name: str
    confidence: float

```

---

### 2. The Ingestion Node: FastAPI & Telegram Webhook

This is the routing hub. It must handle incoming JSON payloads from Telegram asynchronously.

**Dependencies:** `fastapi`, `uvicorn`, `httpx`, `python-telegram-bot` (optional, raw HTTP is often faster for webhooks).

**Core Webhook Logic (`main.py`):**

1. Define a `POST /webhook` endpoint.
2. Parse the Telegram `Update` object.
3. Check for `message.location`. If present, cache the latitude/longitude in memory or a lightweight Redis instance mapped to the `chat_id`.
4. Check for `message.photo`. Extract the `file_id` of the last item in the photo array to get the highest resolution.
5. Construct the download URL: `https://api.telegram.org/file/bot<BOT_TOKEN>/<FILE_PATH>`.
6. Download the image into a byte buffer (`io.BytesIO`) rather than saving to disk to eliminate I/O bottlenecks.

---

### 3. The Perception Engine: Vision Pipeline

Instead of loading a heavy ResNet model locally, use an API for speed during the hackathon, wrapping it in an asynchronous function.

**Implementation Steps:**

1. Pass the image byte buffer to the Gemini 1.5 Flash API (or OpenAI `gpt-4o`).
2. **System Prompt:** "You are an expert agronomist. Analyze this plant image. Return ONLY a JSON object matching this schema: `{'crop_type': '...', 'disease_name': '...', 'confidence': 0.00}`. If healthy or unrecognizable, return 'Unknown' for disease."
3. Parse the returned JSON into your `VisionExtraction` Pydantic model.
4. If `confidence < 0.80`, flag the `status` as `HUMAN_ESCALATION` and bypass the RAG system.

---

### 4. The Knowledge Base: RAG & Darija/Tashelhit Generation

This pipeline grounds the AI's advice in official regulations and translates it into an accessible dialect.

**Vector Store Setup (`rag_pipeline.py`):**

1. **Loader:** Load the ONSSA *Index Phytosanitaire* PDF using `PyPDFLoader`.
2. **Chunking:** Use `RecursiveCharacterTextSplitter` (chunk_size=500, chunk_overlap=50). You want small chunks containing specific crop-disease-chemical mappings.
3. **Embedding:** Use a fast embedding model like `text-embedding-3-small` or `models/embedding-001`.
4. **Storage:** Initialize a local **FAISS** vector store. Save it to disk (`faiss_index`) so you don't have to re-embed on every server restart.

**The Retrieval & Generation Chain:**

1. Perform a similarity search in FAISS using the query: `f"Treatment for {vision_data.disease_name} on {vision_data.crop_type}"`.
2. Extract the top `k=3` relevant text chunks.
3. **The Generation Prompt:** "You are Mourchid-AI, an official agricultural assistant. The system detected `{vision_data.disease_name}` on `{vision_data.crop_type}`. Using ONLY the provided context, state the approved chemical treatment. Write the response in Latin-script Moroccan Darija or Tashelhit, depending on the user's initial greeting. Keep it concise."
4. Execute an HTTP POST back to Telegram's `sendMessage` endpoint with the generated text.

---

### 5. Data Orchestration: Kafka & Airflow (The Advanced Tier)

To truly demonstrate scalable engineering and handle the "Self-Improving Feedback Loop" without bogging down the main FastAPI thread, implement an event-driven architecture.

**The Streaming Layer (Kafka):**

* Instead of FastAPI writing directly to SQLite, have the webhook publish a message to a Kafka topic named `disease_reports`.
* A separate Python consumer subscribes to `disease_reports` and writes the batch to the database. This proves the system can handle thousands of simultaneous photo uploads during a national disease outbreak without crashing.

**The Feedback Orchestrator (Airflow):**

* Create an Airflow DAG named `farmer_feedback_scheduler`.
* Schedule it to run `@hourly`.
* **Task 1 (`extract_due_followups`):** Query the database for records where the timestamp is older than 14 days (or 2 minutes for the hackathon demo) and status is `CLOSED`.
* **Task 2 (`dispatch_telegram_poll`):** Iterate through the `chat_id`s and send a follow-up message: *"Did the suggested treatment work? Reply 1 for Yes, 2 for No."*
* **Task 3 (`update_weights`):** When the webhook receives the "1" or "2", it triggers a Kafka event that updates a "treatment efficacy" table, dynamically feeding back into the RAG system's context prioritization.

---

### 6. The Command Center: Streamlit Dashboard

The Streamlit app reads directly from the database populated by the Kafka consumer to provide the Ministry of Agriculture with a live epidemiological radar.

**Key Libraries:** `streamlit`, `pandas`, `folium`, `streamlit-folium`.

**Dashboard Logic (`app.py`):**

1. **Data Fetch:** `df = pd.read_sql("SELECT latitude, longitude, disease_detected FROM reports", con)`
2. **The Heatmap:** Initialize a Folium map centered on coordinates `[31.79, -7.09]` (Morocco).
3. Extract coordinates as a list of lists: `heat_data = df[['latitude', 'longitude']].values.tolist()`.
4. Apply the `HeatMap(heat_data)` plugin from `folium.plugins`.
5. Render in Streamlit using `st_folium(map, width=800, height=600)`.

This specification provides a highly decoupled, modular architecture. You have the edge ingestion, the AI processing layer, the data streaming backbone, and the macro-visualization frontend.
