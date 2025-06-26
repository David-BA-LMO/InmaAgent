import callbacks_functions from './callbacks.js';
import { createBotMessageContainer } from './messages.js';
import { renderize_html, cleanTemporalSpan } from './renderer.js';
import { scrollToBottom} from './utils.js';
//import { cleanTextForAvatar} from './avatarRender.js';
import { speakAvatar } from "./avatar.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export let tempImageUrls = [];
let targetDiv = null;


export async function processMessage(messageData) {
  try {
    if (!messageData) return;

    let messageDiv = createBotMessageContainer("bot");
    document.getElementById("chat-container").appendChild(messageDiv);
    targetDiv = messageDiv.querySelector(".bot-message-content");

    let response;
    if (messageData instanceof FormData) {
      response = await fetch(`${BASE_URL}/chat`, {
        credentials: 'include',
        method: 'POST', 
        body: messageData
      });
    } else {
      response = await fetch(`${BASE_URL}/chat`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API response error", errorData.detail);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let currentParagraph = "";
    let completeAnswer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (currentParagraph.trim().length > 0) {
          enqueueParagraph(currentParagraph); // Último párrafo pendiente
        }
        break;
      }

      let chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        try {
          let data = JSON.parse(line);
          
          // 1. Procesamiento de texto
          if (data.type === "text") {
            await renderize_html(data.content, targetDiv);
            completeAnswer += data.content;
          
          // 2. Procesamiento de imagen
          } else if (data.type === "image") {
            tempImageUrls.push(data.content);
          
          // 3. Procesamiento de función
          } else if (data.type === "function") {
            await executeFunction(data.content, data.input);
          
          // 4. Procesamiento de coordenada
          } else if (data.type === "coord") {
            renderMap(data.content);
          }
        } catch (error) {
          console.error("Error procesando línea JSON:", line, error);
        }
      }
    }

    if(completeAnswer){
      //let cleanCompleteAnswer = cleanTextForAvatar(completeAnswer)
      await speakAvatar("Hola a todos!. Bienvenidos al mundo inmobiliario. Soy tu asistente de Inteligencia Artificial")
    }

    if (tempImageUrls.length > 0) {
      callbacks_functions.generateImageCarrousel(targetDiv, tempImageUrls);
      tempImageUrls = [];
    }

    scrollToBottom();
  } catch (error) {
    targetDiv.insertAdjacentHTML('beforeend', `Error: ${error.message}`);
  } finally {
    await cleanTemporalSpan();
  }
}

async function executeFunction(functionName, input) {
  if (typeof callbacks_functions[functionName] === "function") {
    try {
      const result = input !== undefined
        ? callbacks_functions[functionName](targetDiv, input)
        : callbacks_functions[functionName](targetDiv);

      if (result instanceof Promise) {
        const resolved = await result;
        await processMessage(resolved);
      } else if (result) {
        await processMessage(result);
      }
    } catch (err) {
      console.error(`Error ejecutando función '${functionName}':`, err);
    }
  } else {
    console.error(`La función '${functionName}' no está definida.`);
  }
}

function renderMap([lon, lat]) {
  const mapDiv = document.createElement("div");
  mapDiv.className = "map-container";
  targetDiv.appendChild(mapDiv);

  const map = L.map(mapDiv).setView([lat, lon], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.marker([lat, lon]).addTo(map).bindPopup(`Ubicación: ${lat}, ${lon}`).openPopup();
}

export async function sendAudioToBackend(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'grabacion.webm');
  await processMessage(formData);
}