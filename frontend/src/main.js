import { startSession, fetchWelcomeMessage } from './api.js';
import { setupUIEvents } from './events.js';
import { createBotMessageContainer } from './messages.js';
import { initAvatarSession} from './avatar.js';

// Punto de entrada al cargar el DOM

document.addEventListener("DOMContentLoaded", async () => {
  await startSession();

  const welcomeData = await fetchWelcomeMessage();
  const chatContainer = document.getElementById("chat-container");

  const welcomeMessageDiv = createBotMessageContainer();
  const targetDiv = welcomeMessageDiv.querySelector(".bot-message-content");
  targetDiv.insertAdjacentHTML("beforeend", welcomeData.message);
  chatContainer.appendChild(welcomeMessageDiv);

  setupUIEvents();

  await initAvatarSession()
});