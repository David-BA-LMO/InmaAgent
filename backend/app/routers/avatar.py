from fastapi import APIRouter, HTTPException
import os
import requests

router = APIRouter()

DID_API_KEY = os.getenv("DID_API_KEY")
DID_API_URL = "https://api.d-id.com/agents"

@router.post("/d-id/create-agent")
def create_did_agent():
    if not DID_API_KEY:
        raise HTTPException(status_code=500, detail="DID API key is not configured.")
    
    print(f"D-ID API KEY: {DID_API_KEY}")

    headers = {
        "Authorization": f"Bearer {DID_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "presenter": {
            "type": "talk",
            "voice": {
            "type": "microsoft",
            "voice_id": "en-US-JennyMultilingualV2Neural"
            },
            "thumbnail": "https://create-images-results.d-id.com/DefaultPresenters/Zivva_f/thumbnail.jpeg",
            "source_url": "https://create-images-results.d-id.com/DefaultPresenters/Zivva_f/thumbnail.jpeg"
        },
        "llm": {
            "type": "openai",
            "provider": "openai",
            "model": "gpt-3.5-turbo",
            "instructions": "You are Scarlett, an AI designed to assist with information about Louvre"
        },
        "preview_name": "Scarlett"
    }
    # https://studio.d-id.com/agents/share?id=agt_9HiHh117&utm_source=copy&key=YkdsdWEyVmthVzU4T1dOeGVGUmFXVlF4UkRwclZGWkdXVTAxTUhwVVEwVmhhVFZqZDFabU5Hbz0=

    try:
        response = requests.post(DID_API_URL, headers=headers, json=payload)
        print("🔁 Respuesta D-ID:", response.status_code, response.text)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print("❌ EXCEPCIÓN al crear agente:", e)
        raise HTTPException(status_code=500, detail=f"Fallo al crear el agente: {e}")
    


    """
    curl -X POST https://api.d-id.com/agents -H "Authorization: Bearer YkdsdWEyVmthVzU4T1dOeGVGUmFXVlF4UkRwclZGWkdXVTAxTUhwVVEwVmhhVFZqZDFabU5Hbz0" -H "Content-Type: application/json" -d "{\"name\": \"Test Agent\", \"avatar\": {\"type\": \"avatar\", \"image_url\": \"https://d-id-public-images.s3.us-west-2.amazonaws.com/ryan.jpg\"}, \"provider\": {\"type\": \"microsoft\", \"voice_id\": \"es-ES-ElviraNeural\"}}"
    """