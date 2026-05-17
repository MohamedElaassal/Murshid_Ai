from pydantic import BaseModel, Field
from typing import Optional

class VisionExtraction(BaseModel):
    crop_type: str = Field(description="The name of the crop or plant")
    disease_name: str = Field(description="The name of the detected disease, or 'Unknown' if unrecognizable or healthy")
    treatment_plan: str = Field(description="The recommended treatment plan in Darija")
    confidence: float = Field(description="Confidence score of the prediction between 0 and 1", ge=0.0, le=1.0)
    raw_class_name: str = Field(description="The raw class name from the PyTorch model output", default="")

class ReportResponse(BaseModel):
    report_id: str
    telegram_chat_id: str
    crop_type: str
    detected_disease: str
    status: str
    
    class Config:
        from_attributes = True
