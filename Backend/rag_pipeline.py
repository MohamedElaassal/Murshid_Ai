import pandas as pd
from pathlib import Path
import litellm
import os
import itertools
from mappings import CLASS_MAPPING_TO_FRENCH

# ── Groq API key pool ──
# Keys are loaded from the environment variable GROQ_API_KEYS (comma-separated)
groq_keys_env = os.environ.get("GROQ_API_KEYS", "")
GROQ_API_KEYS = [k.strip() for k in groq_keys_env.split(",") if k.strip()]

if not GROQ_API_KEYS:
    GROQ_API_KEYS = [""] # Fallback to empty to avoid itertools cycle error on startup
_groq_key_cycle = itertools.cycle(GROQ_API_KEYS)

def _next_groq_key() -> str:
    return next(_groq_key_cycle)

# Load ONSSA Database globally
try:
    rag_docs_dir = Path("RagDocs").resolve()
    # Use glob to find the csv
    onssa_files = list(rag_docs_dir.glob("*.csv"))
    if not onssa_files:
        raise FileNotFoundError(f"Could not find any ONSSA database file in {rag_docs_dir}")
    
    ONSSA_FILE_PATH = onssa_files[0]
    print(f"Loading ONSSA Database from {ONSSA_FILE_PATH}...")
    
    try:
        onssa_df = pd.read_csv(ONSSA_FILE_PATH, encoding='utf-8')
    except UnicodeDecodeError:
        onssa_df = pd.read_csv(ONSSA_FILE_PATH, encoding='latin1')
        
    print(f"ONSSA Database loaded successfully with {len(onssa_df)} rows!")
    
except Exception as e:
    print(f"Failed to load ONSSA database: {e}")
    onssa_df = None

async def get_rag_treatment(raw_class_name: str) -> str:
    """
    Retrieves the approved ONSSA products for the disease and generates a Darija treatment plan.
    """
    if raw_class_name not in CLASS_MAPPING_TO_FRENCH:
        return "لا يوجد معلومات دقيقة عن هذا المرض في قاعدة البيانات."
        
    mapping = CLASS_MAPPING_TO_FRENCH[raw_class_name]
    culture = mapping["culture"]
    maladie = mapping["maladie"]
    
    if maladie == "Sain" or maladie == "Aucune":
        return "النبتة تبدو بصحة جيدة. لا حاجة لأي علاج."
        
    if onssa_df is None:
        return f"قاعدة البيانات غير متوفرة حالياً لعلاج {maladie} في {culture}."
        
    # Filter the dataframe for matching Culture and Disease (Usage)
    mask_culture = onssa_df["Culture"].str.contains(culture, case=False, na=False)
    mask_maladie = onssa_df["Usage"].str.contains(maladie, case=False, na=False)
    
    filtered_df = onssa_df[mask_culture & mask_maladie]
    
    if filtered_df.empty:
        return f"لم نجد دواء معتمد في قاعدة بيانات أونسا لعلاج {maladie} في {culture}."
        
    # Get top 3 products
    top_products = filtered_df.head(3)
    
    context_str = ""
    for idx, row in top_products.iterrows():
        # First column is 'Produits (4692)' usually, let's use positional or partial matching
        produit_col = [c for c in onssa_df.columns if "Produits" in str(c)]
        produit_col_name = produit_col[0] if produit_col else "Produit"
        
        produit = row.get(produit_col_name, "N/A")
        matiere = row.get("Matière active", "N/A")
        dose = row.get("Dose", "N/A")
        dar = row.get("DAR", "N/A")
        context_str += f"- Produit: {produit}, Matière active: {matiere}, Dose: {dose}, Délai avant récolte (DAR): {dar}\n"

    # Prompt Groq to generate a Darija response
    prompt = f"""أنت مرشد فلاحي مغربي. النبتة مصابة بـ '{maladie}' في زراعة '{culture}'.
قاعدة بيانات لونسا (ONSSA) كتقترح هاد الأدوية المرخصة:
{context_str}

بناء على هاد المعطيات، عطيني خطة علاج بالدارجة المغربية (مكتوبة بالحروف العربية)، تكون ساهلة ومفهومة للفلاح. 
ذكر السميات ديال المواد الفعالة أو الأدوية والجرعة (Dose) وفترة ما قبل الجني (DAR) يلا كانت. 
ماتستعملش الفصحى، وما تديرش الـ markdown (بلا نجمات أو هاشتاك).
"""

    messages = [
        {"role": "user", "content": prompt}
    ]

    try:
        resp = await litellm.acompletion(
            model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
            api_key=_next_groq_key(),
            messages=messages,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling Groq for RAG generation: {e}")
        return "وقع مشكل فاش بغينا نوجدو خطة العلاج. جرب من بعد."
