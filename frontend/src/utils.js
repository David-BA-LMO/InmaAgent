import { tempImageUrls} from './processor.js';

// DESPLAZARSE AL FINAL DEL CONTENEDOR DE CHAT
export function scrollToBottom() {
    const chatContainer = getLastBotMessageContent();
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


// FUNCIÓN PARA LOCALIZAR EL MENSAJE BOT MÁS RECIENTE
export function getLastBotMessageContent() {
    const elements = document.querySelectorAll('.bot-message-content');
    return elements.length > 0 ? elements[elements.length - 1] : null;
}

// EVENTO AL MODIFICAR EL TAMAÑO DEL NAVEGADOR
window.addEventListener('resize', function () {
    const lastDiv = getLastBotMessageContent();
    if (lastDiv && tempImageUrls.length>0) {
        callbacks_functions.generateImageCarrousel(lastDiv, tempImageUrls);
    }
});