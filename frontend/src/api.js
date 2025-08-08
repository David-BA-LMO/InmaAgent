import { createBotMessageContainer } from './messages.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// INICIO DE SESIÓN
export async function startSession() {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            credentials: 'include',
            method: 'POST'
        });
        const data = await response.json();
    } catch (error) {
        console.error("Error al iniciar la sesión: ", error);
        const errorMessageDiv = createBotMessageContainer('bot');
        const chatContainer = document.getElementById("chat-container");
        targetDiv = errorMessageDiv.querySelector(".bot-message-content");
        targetDiv.insertAdjacentHTML('beforeend', `Error: ${error.message}`);
        chatContainer.appendChild(errorMessageDiv);
    }
}