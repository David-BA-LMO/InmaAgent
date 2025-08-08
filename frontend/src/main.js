import { startSession } from './api.js';
import { setupUIEvents } from './events.js';
import { createBotMessageContainer } from './messages.js';
import { speakAvatar} from './avatar.js';
import { cleanMarkdownForSpeech } from './utils.js';


document.addEventListener("DOMContentLoaded", async () => {

  // Inicio de sesión
  await startSession();

  // Mensaje de bienvenida en el chat
  const welcomeMessage = import.meta.env.VITE_WELCOME_MESSAGE;
  const chatContainer = document.getElementById("chat-container");
  const welcomeMessageDiv = createBotMessageContainer();
  const targetDiv = welcomeMessageDiv.querySelector(".bot-message-content");
  targetDiv.insertAdjacentHTML("beforeend", welcomeMessage);
  chatContainer.appendChild(welcomeMessageDiv);

  // Eventos de inicio
  setupUIEvents();

  // Mensaje de bienvenida en el avatar
  console.log(cleanMarkdownForSpeech(welcomeMessage))
  await speakAvatar(cleanMarkdownForSpeech(welcomeMessage))
});