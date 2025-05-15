import { createUserMessageContainer} from './messages.js';
import { processMessage } from './processor.js';


// ---------- ENVÍO DE MENSAJE DE TEXTO ----------
export async function sendUserMessage(userInput) {
    if (userInput.trim() === "") return;

    // Limpiar el campo de entrada del usuario
    document.getElementById("user-input").value = "";
    
    // Crear y mostrar el mensaje del usuario en la interfaz
    createUserMessageContainer(userInput);

    // Crear la estructura del mensaje para enviar al backend
    const messageData = {
        type: "text",
        content: userInput
    };

    // Llamar a processMessage con los datos generados
    processMessage(messageData);
}


// ---------- ENVÍO DE MENSAJE DE AUDIO ----------
let mediaRecorder = null;
let audioChunks = [];
let stopTimeout = null;

const micButton = document.getElementById("mic-button");

export async function recordUserAudio(micButton) {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      stopRecording();
      return;
    }
  
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Tu navegador no soporta la grabación de audio.");
      return;
    }
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
  
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
  
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
  
        createUserMessageContainer("Audio enviado");
        sendAudioToBackend(audioBlob);
  
        micButton.classList.remove("recording");
        stream.getTracks().forEach(track => track.stop());
      };
  
      mediaRecorder.start();
      micButton.classList.add("recording");
      stopTimeout = setTimeout(stopRecording, 30000);
  
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("No se pudo acceder al micrófono.");
    }
  }
  
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      clearTimeout(stopTimeout);
    }
  }
  
  async function sendAudioToBackend(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    await processMessage(formData);
  }