from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

# Cấu hình API của Ollama
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "timelinebot"

def query_model(prompt):
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }
    try:
        response = requests.post(OLLAMA_API_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        return response.json().get("response", "No response from model.")
    except requests.exceptions.RequestException as e:
        return f"Error: {str(e)}"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    response = query_model(prompt)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)