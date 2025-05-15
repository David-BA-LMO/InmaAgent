import {recordUserAudio, sendUserMessage} from './recorder.js';

// -------- EVENTOS DEL DOM --------
export function setupUIEvents() {

    // Evento de grabación de audio
    const micButton = document.getElementById("mic-button");
    micButton.addEventListener("click", () => recordUserAudio(micButton));

    // Evento de envío del mensaje por botón
    const sendButton = document.getElementById("send-button");
    sendButton.addEventListener("click", () => {
        sendUserMessage(userInput.value);
    });

    // Evento de envío del mensaje por enter
    const userInput = document.getElementById("user-input");
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            sendUserMessage(userInput.value);
        }
    });

    // Evento resize si es necesario
    window.addEventListener('resize', () => {
        const lastDiv = document.querySelector('.bot-message-content:last-of-type');
    });
  }