import { marked } from "marked";
import { scrollToBottom } from './utils.js';

let markdownBuffer = '';  // Buffer que almacena el markdown csompleto.
let tempSpan = null;  // Variable para el span temporal.


export async function renderize_html(chunk, targetDiv) {
    // Eliminar elementos markdown del chunk (simplificación)
    const plainText = chunk.replace(/[#*_\[\]\(\)`]/g, '');

    // Si no existe un span temporal, lo creamos.
    if (!tempSpan) {
        tempSpan = document.createElement('span');
        tempSpan.className = 'temp-span';
        targetDiv.appendChild(tempSpan);
    }

    // Insertamos el texto plano en el span temporal.
    tempSpan.innerText += plainText;

    // Añadimos el chunk completo (con markdown) al buffer.
    markdownBuffer += chunk;

    // Verificamos si hemos llegado al final de una estructura markdown.
    if (isCompleteMarkdown(markdownBuffer)) {
        // Si el markdown está completo, renderizamos el HTML final.
        renderFinalHTML(targetDiv);
    }
}

// Detectar si el markdown está completo.
function isCompleteMarkdown(buffer) {
    // Aquí definimos los criterios para determinar si el bloque markdown está completo.
    // Por ejemplo, puedes verificar por saltos de línea dobles o cierres de etiquetas markdown.
    const closingTags = ['\n\n', '</ul>', '</ol>', '</h1>', '</h2>', '</p>'];
    return closingTags.some(tag => buffer.includes(tag));
}

// Función para eliminar el span temporal y sustituirlo por el contenido renderizado.
function renderFinalHTML(targetDiv) {
    if (tempSpan) {
        // Eliminamos el span temporal.
        targetDiv.removeChild(tempSpan);
        tempSpan = null;
    }

    // Convertimos el contenido markdown acumulado en HTML usando marked.js
    const renderedHTML = marked.parse(markdownBuffer);

    // Insertamos el HTML renderizado en el targetDiv.
    targetDiv.innerHTML += renderedHTML;

    // Limpiamos el buffer después de renderizar.
    markdownBuffer = '';

    scrollToBottom();
}

export async function cleanTemporalSpan() {
    tempSpan = null;
    markdownBuffer = "";
    // Selecciona todos los elementos con la clase 'temp-span'
    const tempSpans = document.querySelectorAll('span.temp-span');

    // Itera sobre cada elemento encontrado
    tempSpans.forEach(tempSpan => {
        // Crea un nuevo elemento <p>
        const pElement = document.createElement('p');
        
        // Copia el contenido del <span> en el nuevo <p>
        pElement.innerHTML = tempSpan.innerHTML;
        
        // Reemplaza el <span> con el nuevo <p>
        tempSpan.parentNode.replaceChild(pElement, tempSpan);
    });
}