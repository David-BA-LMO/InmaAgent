// src/avatar.js

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/microsoft.cognitiveservices.speech.sdk';

let avatarSynthesizer = null;
let peerConnection = null;
let isAvatarStarted = false;
let inactivityTimeout = null;
let initPromise = null; // Promesa global para espera a la inicialización
let speakingQueue = Promise.resolve(); 
const div_avatar = "avatar-container"
const background_image_url = "https://i.imgur.com/HiilKPr.png"


/* ---------------------- CONSTANTES ---------------------- */
const KEY = import.meta.env.VITE_AZURESPEECH_KEY;
const REGION = import.meta.env.VITE_AZURESPEECH_REGION;
const LANGUAGE = import.meta.env.VITE_AZURESPEECH_LANGUAGE;
const VOICE = import.meta.env.VITE_AZURESPEECH_VOICE;
const CHARACTER = import.meta.env.VITE_AZURESPEECH_CHARACTER;
const STYLE = import.meta.env.VITE_AZURESPEECH_STYLE;
const INACTIVITY_LIMIT_MS = 2 * 60 * 1000; // El primer valor indica los minutos


/* ---------------------- CONFIGURACIÓN DE VOZ ---------------------- */
const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(KEY, REGION);
speechConfig.speechSynthesisLanguage = LANGUAGE;
speechConfig.speechSynthesisVoiceName = VOICE;  


/* ---------------------- CONFIGURACIÓN DE AVATAR ---------------------- */
let avatarConfig = null;

function createAvatarConfig(containerId) {
  const container = document.getElementById(containerId);
  

  if (!container) {
    console.warn(` Contenedor '${containerId}' no encontrado.`);
    return new SpeechSDK.AvatarConfig(CHARACTER, STYLE); // fallback sin crop
  }

  const containerHeight = container.offsetHeight;
  const containerWidth = container.offsetWidth;

  // El video del avatar es siempre 1920x1080 (16:9)
  const videoHeight = 1080;
  const videoWidth = 1920;

  // Calculamos el ancho ideal para mantener altura = 1080
  const targetAspectRatio = containerWidth / containerHeight;
  const idealAspectRatio = videoWidth / videoHeight;

  let cropLeft = 0;
  let cropRight = videoWidth;

  if (targetAspectRatio < idealAspectRatio) {
    // Más alto que ancho → necesitamos recortar horizontalmente
    const newWidth = targetAspectRatio * videoHeight;
    const cropMargin = (videoWidth - newWidth) / 2;
    cropLeft = Math.round(cropMargin);
    cropRight = Math.round(videoWidth - cropMargin);
  }

  const videoFormat = new SpeechSDK.AvatarVideoFormat();
  videoFormat.setCropRange(
    new SpeechSDK.Coordinate(cropLeft, 0),
    new SpeechSDK.Coordinate(cropRight, videoHeight)
  );

  avatarConfig = new SpeechSDK.AvatarConfig(CHARACTER, STYLE, videoFormat);
  avatarConfig.backgroundImage = background_image_url;

  return avatarConfig;
}


/* ---------------------- OBTENER SERVIDOR ICE ---------------------- */
async function getIceServer() {
  const response = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`, {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error en respuesta del servidor: ${response.status} - ${text}`);
  }

  const relayToken = await response.json();

  return [{
    urls: relayToken.Urls,
    username: relayToken.Username,
    credential: relayToken.Password
  }];
}


/* ---------------------- ESTABLECER PEERCONNECTION ---------------------- */
async function createPeerConnection(iceServers) {

  peerConnection = new RTCPeerConnection({
    iceServers
  });

  // Recibir video/audio y montarlos en el contenedor especificado
  peerConnection.ontrack = function (event) {
    const container = document.getElementById(div_avatar);
    if (!container) {
      console.warn(`Contenedor con id '${div_avatar}' no encontrado.`);
      return;
    }

    if (event.track.kind === 'video') {
      let videoElement = document.getElementById('videoPlayer');

      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.id = 'videoPlayer';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        container.appendChild(videoElement);
      }

      videoElement.srcObject = event.streams[0];
    }

    if (event.track.kind === 'audio') {
      let audioElement = document.getElementById('audioPlayer');

      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.id = 'audioPlayer';
        audioElement.autoplay = true;
        container.appendChild(audioElement);
      }

      audioElement.srcObject = event.streams[0];
    }
  };

    // Pedimos recibir video y audio (modo 'sendrecv' para negociación WebRTC completa)
    peerConnection.addTransceiver('video', { direction: 'sendrecv' });
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });

    return peerConnection;
}

/* ---------------------- REINICIAR AVATAR TRAS INACTIVIDAD ---------------------- */
function resetInactivityTimer() {
  clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(() => {
    console.log('Inactividad detectada. Cerrando avatar...');
    closeAvatarConnection();
  }, INACTIVITY_LIMIT_MS);
}

/* ---------------------- LIMPIAR CONTENEDOR ---------------------- */
function cleanAvatarContainer() {
  const container = document.getElementById(div_avatar);
  if (container) container.innerHTML = '';
}


/* ---------------------- HACER HABLAR AL AVATAR ---------------------- */
export async function speakAvatar(text) {

  // 1. Llamada a speakAvatar()
  try {
    resetInactivityTimer(); // 2. Reseteo del temporizador de inactividad
    await ensureAvatarReady(); // 3. Garantiza que la conexión esté lista. Si no es el caso, crea una nueva

    // Serializar locuciones en una cola para evitar solapamientos
    speakingQueue = speakingQueue.then(() => new Promise((resolve, reject) => {
      avatarSynthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('Avatar habló:', text);
            resolve(result);
          } else {
            console.warn('Fallo en la síntesis. ID:', result.resultId);
            reject(result);
          }
        },
        (err) => {
          console.error('Error al sintetizar:', err);
          reject(err);
        }
      );
    })).catch(async (err) => {      
      await reconnectAvatar(); // Estrategia de reconexión si falla una locución
      throw err;
    });

    return speakingQueue;
  } catch (e) {
    console.error('Error en speakAvatar:', e);
    await reconnectAvatar();
    throw e;
  }
}


/* ---------------------- ESPERA ACTIVA A LA CONEXIÓN ---------------------- */
function waitForPeerConnectionConnected(pc, timeoutMs = 15000) {
  if (!pc) return Promise.reject(new Error('No hay RTCPeerConnection'));
  if (pc.connectionState === 'connected') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pc.removeEventListener('connectionstatechange', onChange);
      reject(new Error('Timeout esperando conexión WebRTC'));
    }, timeoutMs);

    const onChange = () => {
      if (pc.connectionState === 'connected') {
        clearTimeout(timer);
        pc.removeEventListener('connectionstatechange', onChange);
        resolve();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        clearTimeout(timer);
        pc.removeEventListener('connectionstatechange', onChange);
        reject(new Error(`Conexión WebRTC en estado ${pc.connectionState}`));
      }
    };

    pc.addEventListener('connectionstatechange', onChange);
  });
}


/* ---------------------- INICIALIZA EL AVATAR ---------------------- */
async function ensureAvatarReady() {
  if (isAvatarStarted && peerConnection?.connectionState === 'connected') return;
  
  // Si la promesa no existe, creamos una
  if (!initPromise) {
    initPromise = (async () => {
      avatarConfig = createAvatarConfig(div_avatar); // 3a. Configuración del avatar

      const iceServers = await getIceServer(); // 3b. Obtener servidores ICE
      peerConnection = await createPeerConnection(iceServers); // 3c. Establece RTCPeerConnection

      avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(speechConfig, avatarConfig); 
      await avatarSynthesizer.startAvatarAsync(peerConnection); // 3d. Inicia avatar con avatarSynthesizer
      await waitForPeerConnectionConnected(peerConnection); // 3e. Espera a que la conexión WebRTC esté activa (connected)
      isAvatarStarted = true;
      console.log('Avatar listo');
    })().catch(async (e) => {
      // Limpia estado si falló
      initPromise = null;
      isAvatarStarted = false;
      await closeAvatarConnection();
      throw e;
    });
  }

  await initPromise; // Si la promesa existe, simplemente esperamos a que termine
}


/* ---------------------- RECONECTAR EL AVATAR ---------------------- */
export async function reconnectAvatar() {
  console.warn('Intentando reconectar avatar...');
  await closeAvatarConnection();
  await initAvatar();
}


/* ---------------------- CERRAR EL AVATAR ---------------------- */
export async function closeAvatarConnection() {
  try {
    if (avatarSynthesizer) {
      avatarSynthesizer.close();
      avatarSynthesizer = null;
    }

    if (avatarSynthesizer?.stopAvatarAsync) {
      try { await avatarSynthesizer.stopAvatarAsync(); } catch (e) {}
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    cleanAvatarContainer();
    isAvatarStarted = false;
    clearTimeout(inactivityTimeout);
    initPromise = null; // <- Añadir esta línea
    speakingQueue = Promise.resolve(); // <- Reset cola también (opcional)

    console.log('Conexión cerrada correctamente.');
  } catch (err) {
    console.error('Error al cerrar conexión:', err);
  }
}


