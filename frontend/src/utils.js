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

// FUNCIÓN DE ESPERA
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// LIMPIEZA DE TEXTO EN MARKDOWN
export function cleanMarkdownForSpeech(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return '';

  return markdownText
    // Eliminar emojis Unicode
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    // Eliminar emoticonos tipo :smile:
    .replace(/:[^:\s]+:/g, '')
    // Eliminar formato de negrita/cursiva
    .replace(/[*_~`#>]+/g, '')
    // Eliminar bloques de código
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    // Eliminar enlaces [texto](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Reemplazar múltiples espacios seguidos
    .replace(/\s+/g, ' ')
    // Trim final
    .trim();
}
