# ai-service/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import torch
from ultralytics import YOLO
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import librosa
import numpy as np
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)

# --- NEW: Priority Determination Function ---
def determine_priority(incident_type, confidence, details=None):
    """
    Determines the priority of an incident based on type, confidence, and detected details.
    """
    if incident_type == 'Crime':
        # Crime with weapons is critical
        if details and any('weapon' in str(d['class']).lower() for d in details):
            return 'Critical'
        return 'High'
    
    if incident_type == 'Fire':
        # Any fire is high priority
        return 'High'
        
    if incident_type == 'Medical':
        # Medical emergencies are critical
        return 'Critical'
        
    if incident_type == 'Accident':
        # Accidents are high priority
        return 'High'
        
    # Default to medium for anything else
    return 'Medium'

# Load models
print("Loading AI models...")
try:
    # Load YOLOv8 model for object detection
    yolo_model = YOLO('yolov8n.pt')  # You would replace with your fine-tuned model
    
    # Load DistilBERT for text classification
    text_tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
    text_model = DistilBertForSequenceClassification.from_pretrained(
        'distilbert-base-uncased', 
        num_labels=4  # Fire, Accident, Crime, Medical
    )
    
    print("Models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    # Initialize with None if models fail to load
    yolo_model = None
    text_model = None

# Define incident types
INCIDENT_TYPES = ['Fire', 'Accident', 'Crime', 'Medical']

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "models_loaded": {
        "yolo": yolo_model is not None,
        "text": text_model is not None
    }})

@app.route('/analyze/image', methods=['POST'])
def analyze_image():
    if not yolo_model:
        return jsonify({"error": "YOLO model not loaded"}), 500
    
    try:
        # Get image from request
        if 'file' in request.files:
            file = request.files['file']
            img_bytes = file.read()
        elif 'image' in request.json:
            img_data = request.json['image']
            img_bytes = base64.b64decode(img_data)
        else:
            return jsonify({"error": "No image provided"}), 400
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp:
            temp.write(img_bytes)
            temp_path = temp.name
        
        try:
            # Run inference
            results = yolo_model(temp_path)
            
            # Process results
            detections = []
            incident_type = None
            max_confidence = 0
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    # Map YOLO class to incident type (simplified mapping)
                    if cls == 0:  # person
                        mapped_type = "Crime"
                    elif cls in [2, 3, 5, 7]:  # car, motorcycle, bus, truck
                        mapped_type = "Accident"
                    elif cls == 28:  # suitcase (placeholder for fire)
                        mapped_type = "Fire"
                    else:
                        mapped_type = None
                    
                    if mapped_type and conf > max_confidence:
                        incident_type = mapped_type
                        max_confidence = conf
                    
                    detections.append({
                        "class": yolo_model.names[cls],
                        "confidence": conf,
                        "bbox": box.xyxy[0].tolist()
                    })
            
            # Clean up temp file
            os.unlink(temp_path)
            
            # --- NEW: Determine priority using AI results ---
            priority = determine_priority(incident_type, max_confidence, detections)
            
            return jsonify({
                "incident_type": incident_type,
                "priority": priority,  # <-- RETURN PRIORITY
                "confidence": max_confidence,
                "detections": detections,
                "model": "YOLOv8"
            })
            
        except Exception as e:
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise e
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/text', methods=['POST'])
def analyze_text():
    if not text_model:
        return jsonify({"error": "Text model not loaded"}), 500
    
    try:
        # Get text from request
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        
        # Tokenize and predict
        inputs = text_tokenizer(text, return_tensors="pt", truncation=True, padding=True)
        
        with torch.no_grad():
            outputs = text_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            predicted_class = torch.argmax(predictions, dim=1).item()
            confidence = predictions[0][predicted_class].item()
        
        # Map class to incident type
        incident_type = INCIDENT_TYPES[predicted_class]
        
        # --- NEW: Determine priority using AI results ---
        priority = determine_priority(incident_type, confidence)
        
        return jsonify({
            "incident_type": incident_type,
            "priority": priority, # <-- RETURN PRIORITY
            "confidence": confidence,
            "model": "DistilBERT"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/audio', methods=['POST'])
def analyze_audio():
    # Placeholder for audio analysis
    try:
        # Get audio from request
        if 'file' in request.files:
            file = request.files['file']
            audio_bytes = file.read()
        else:
            return jsonify({"error": "No audio file provided"}), 400
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp:
            temp.write(audio_bytes)
            temp_path = temp.name
        
        try:
            # Load audio file
            y, sr = librosa.load(temp_path)
            
            # Extract features (placeholder for actual audio model)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Simple classification based on audio features (placeholder)
            # In a real implementation, you would use a trained model like YAMNet
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            mean_centroid = np.mean(spectral_centroid)
            
            # Very basic heuristic classification
            if mean_centroid > 5000:
                incident_type = "Crime"  # High frequency might be gunshot
                confidence = 0.7
            elif mean_centroid > 3000:
                incident_type = "Accident"  # Mid-high frequency might be crash
                confidence = 0.6
            elif mean_centroid > 1500:
                incident_type = "Fire"  # Mid frequency might be fire alarm
                confidence = 0.5
            else:
                incident_type = "Medical"  # Low frequency might be siren
                confidence = 0.4
            
            # Clean up temp file
            os.unlink(temp_path)
            
            # --- NEW: Determine priority using AI results ---
            priority = determine_priority(incident_type, confidence)
            
            return jsonify({
                "incident_type": incident_type,
                "priority": priority, # <-- RETURN PRIORITY
                "confidence": confidence,
                "model": "AudioClassifier"
            })
            
        except Exception as e:
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise e
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)