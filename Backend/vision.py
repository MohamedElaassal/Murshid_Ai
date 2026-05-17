import io
import json
import torch
from torchvision import transforms
from PIL import Image
from pathlib import Path
from schemas import VisionExtraction

# Paths
MODEL_PATH = Path("../Model/plant_disease_model_1_latest.pt").resolve()
CLASSES_PATH = Path("../Model/classes.json").resolve()

# Load class mappings
with open(CLASSES_PATH, "r") as f:
    class_mapping = json.load(f)

class PlantDiseaseModel(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.conv_layers = torch.nn.Sequential(
            torch.nn.Conv2d(3, 32, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(32),
            torch.nn.Conv2d(32, 32, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(32),
            torch.nn.MaxPool2d(2, 2),

            torch.nn.Conv2d(32, 64, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(64),
            torch.nn.Conv2d(64, 64, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(64),
            torch.nn.MaxPool2d(2, 2),

            torch.nn.Conv2d(64, 128, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(128),
            torch.nn.Conv2d(128, 128, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(128),
            torch.nn.MaxPool2d(2, 2),

            torch.nn.Conv2d(128, 256, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(256),
            torch.nn.Conv2d(256, 256, kernel_size=3, padding=1),
            torch.nn.ReLU(),
            torch.nn.BatchNorm2d(256),
            torch.nn.MaxPool2d(2, 2),
        )
        self.dense_layers = torch.nn.Sequential(
            torch.nn.Dropout(0.2),
            torch.nn.Linear(256 * 14 * 14, 1024),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(1024, 39)
        )
        
    def forward(self, xb):
        out = self.conv_layers(xb)
        out = out.view(out.size(0), -1)
        out = self.dense_layers(out)
        return out

# Initialize model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Loading PyTorch model on {device}...")

try:
    model = PlantDiseaseModel()
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()
except Exception as e:
    print(f"Failed to load model: {e}")
    model = None

# Standard ImageNet transforms for pretrained PyTorch models
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

async def analyse_crop_image(image_bytes: bytes, mime_type: str) -> VisionExtraction:
    """
    Run inference using the local PyTorch model.
    """
    if model is None:
        raise RuntimeError("Model was not loaded correctly.")

    try:
        # Load image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Apply transformations and add batch dimension
        input_tensor = transform(image).unsqueeze(0).to(device)
        
        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            confidence, predicted_idx = torch.max(probabilities, dim=0)
            
        confidence_score = confidence.item()
        class_name = class_mapping[str(predicted_idx.item())]
        
        # Parse "Crop___Disease"
        parts = class_name.split("___")
        crop_type = parts[0].replace("_", " ") if len(parts) > 0 else "غير محدد"
        disease_name = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"
        
        if disease_name.lower() == "healthy":
            disease_name = "Unknown"  # Healthy fallback as per spec

        # We rely entirely on RAG for the Darija treatment plan now
        treatment_plan = "سيتم تحديد العلاج من قاعدة البيانات (RAG)."
        
        return VisionExtraction(
            crop_type=crop_type,
            disease_name=disease_name,
            treatment_plan=treatment_plan,
            confidence=confidence_score,
            raw_class_name=class_name
        )
        
    except Exception as e:
        print(f"Error during PyTorch inference: {e}")
        return VisionExtraction(
            crop_type="غير محدد",
            disease_name="غير محدد",
            treatment_plan="تعذر تحليل الصورة.",
            confidence=0.0
        )
