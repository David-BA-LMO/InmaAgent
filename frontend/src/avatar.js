// src/avatar.js
//import {getAudioFromElevenLabs, audioBufferToBase64} from "./audio.js";

/* ---------------------- CONSTANTES ---------------------- */
const API_KEY        = import.meta.env.VITE_DID_API_KEY;
const PRESENTER_ID   = import.meta.env.VITE_DID_PRESENTER_ID;
const VOICE_PROVIDER = import.meta.env.VITE_DID_VOICE_PROVIDER
const VOICE_ID       = import.meta.env.VITE_DID_VOICE_ID

/* ------ ESTADO GLOBAL ------ */
let pc               = null;       // RTCPeerConnection activo
let streamId         = null;       // ID de D‑ID para el stream
let sessionId        = null;       // session_id devuelto por D‑ID
const id_video = "avatarVideo";
let videoEl = null

/* ------ ESTADOS ------ */
let isSpeaking = false;
let idleTimer = null;
const IDLE_TIMEOUT_MS = 2000; // 2 seg después de hablar


/* ------ CABECERA AUTH REUTILIZABLE ------ */
const authHdr = {
  accept: "application/json",
  "content-type": "application/json",
  authorization: "Basic " + btoa(API_KEY + ":")    // <base64(API_KEY+:)>
};


/* ------ INICIALIZACIÓN DEL AVATAR ------
  Esta función solo se ejecuta una vez por sesión */
export async function initAvatarSession () {
  videoEl = document.getElementById(id_video);
  if (!videoEl) {
    console.error("No se encontró el elemento avatarVideo en el DOM.");
    throw new Error("Elemento de video no encontrado.");
  }

  await createClipStream();      // PASO 1, 2 y 3
  await waitForConnection();     // PASO 4
}



/* ------ PASO 1: LLAMADA POST PARA CREAR EL STREAM ------
  Debe devolver los siguientes valores:
    - id (streamId): identificador único del stream 
    - session_id (sessionId): sesión WebRTC
    - offer, ice_servers: datos necesarios para negociar WebRTC

*/
async function createClipStream () {
  try {
    const res = await fetch("https://api.d-id.com/clips/streams", {  // llamada a /clips/streams 
      method : "POST",
      headers: authHdr,
      body   : JSON.stringify({
        presenter_id : PRESENTER_ID,   // Imagen del avatar seleccionado
        stream_warmup: true,
        fluent: true
      })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`createClipStream → HTTP ${res.status}: ${err}`);
    }

    const { id, session_id, offer, ice_servers } = await res.json();
    streamId  = id;
    sessionId = session_id;

    // Ejecución del PASO 2
    await respondToOffer(offer, ice_servers);

  } catch (err) {
    console.error("Error en la creación del stream:", err);
    throw err;
  }
}



/* ------ PASO 2: NEGOCIACIÓN P2P Y RESPUESTA A LA OFERTA SDP ------ */
async function respondToOffer (remoteOffer, iceServers) {

try {

    // Creación de una conexión WebRTC con los servidores STUN/TURN (ice servers). Cerramos la conexión previa si ya existía una.
    if (pc) {
      console.warn("PeerConnection ya existía. Cerrando...");
      pc.close();
    }
    pc = new RTCPeerConnection({ iceServers });

    // Evento para manejar la llegada de audio/video (track remoto). Se vincula ese stream al <video> HTML
    pc.ontrack = ({ streams }) => {
      console.log("Recibido track remoto:", streams); // Es de esperar recibir un track para audio y otro para video.
      if (videoEl && videoEl.srcObject !== streams[0]) {
        videoEl.srcObject = streams[0];
        console.log("Stream asignado al elemento de video.");
        console.log("Track(s) activos:", streams[0]?.getTracks());
      }
    };

    // Envio de candidatos ICE a D-ID cuando el navegador los descubra
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log("Enviando ICE candidate...");  // Suelen enviarse varios candidatos dependiendo de la conexión
        sendIceCandidate(candidate);  // Ejecución del PASO 3
      }
    };

    // Eventos varios opcionales para depuración y estado
    pc.addEventListener("iceconnectionstatechange", () => {
      console.log("Estado ICE:", pc.iceConnectionState);
    });

    pc.addEventListener("connectionstatechange", () => {
      console.log("Estado conexión:", pc.connectionState);
    });

    pc.addEventListener("signalingstatechange", () => {
      console.log("Estado señalización:", pc.signalingState);
    });

    // Oferta SDP al navegador
    await pc.setRemoteDescription(remoteOffer);
    console.log("SDP remote offer establecida.");

    // Establecemos la respuesta del navegador a la oferta SDP.  
    // "have-remote-offer" indica que se ha recibido la oferta del servidor y aún no has enviado respuesta.
    if (pc.signalingState === "have-remote-offer") {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("SDP answer creada y establecida localmente.");

      // Envio de la respuesta a D-ID para completar el handshake
      const res = await fetch(`https://api.d-id.com/clips/streams/${streamId}/sdp`, {
        method: "POST",
        headers: authHdr,
        body: JSON.stringify({
          answer: answer,
          session_id: sessionId
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Fallo al enviar SDP answer: ${res.status} - ${errorText}`);
      }

      console.log("SDP answer enviada correctamente a D-ID.");
    } else {
      throw new Error("Estado de señalización inesperado al recibir oferta: " + pc.signalingState);
    }
  } catch (err) {
    console.error("Error en respondToOffer:", err);
    throw err;
  }
}



/* ------ PASO 3: ENVIO DE CANDIDATOS ICE PARA LA CONEXIÓN ------ */
function sendIceCandidate({ candidate, sdpMid, sdpMLineIndex }) {
  if (!candidate) {
    console.warn("ICE candidate vacío o inválido, no se envía.");
    return;
  }

  fetch(`https://api.d-id.com/clips/streams/${streamId}/ice`, {
    method: "POST",
    headers: authHdr,
    body: JSON.stringify({
      candidate,
      sdpMid,
      sdpMLineIndex,
      session_id: sessionId
    })
  })
  .then(res => {
    if (!res.ok) {
      console.error("Fallo al enviar ICE candidate:", res.status);
    } else {
      console.log("ICE candidate enviado correctamente.");
    }
  })
  .catch(err => {
    console.error("Error al enviar ICE candidate:", err);
  });
}



/* ----- PASO 4: VALIDACIÓN FINAL DE LA CONEXIÓN -------- */
// Esperamos a que la conexión WebRTC alcance el estado connected
function waitForConnection() {
  return new Promise((resolve, reject) => {
    if (!pc) {
      return reject(new Error("PeerConnection no inicializado"));
    }

    // Si ya está conectado, resolvemos inmediatamente
    if (["connected", "completed"].includes(pc.connectionState)) {
      console.log("Conexión WebRTC ya establecida.");
      return resolve();
    }

    // Esperamos cambios en el estado de conexión
    pc.addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      console.log("Cambio de estado de conexión:", state);

      if (["connected", "completed"].includes(state)) {
        resolve(); // Éxito
      } else if (state === "failed") {
        reject(new Error("Fallo en la conexión ICE/WebRTC"));
      }
    });
  });
}



// ------ ENVIO DE TEXTO AL AVATAR ------ 
export async function speakAvatar(text) {

  // Solo prueba
  //createIdleClip()
  //getIdleClipById("clp_Vi8CNfA4OR13i0oa3GY1G")

  await waitForConnection()

  // Validación del texto
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("speakAvatar → El texto no puede estar vacío.");
  }

  // Construcción del cuerpo
  const body = {
    script: {
      type: "text",
      provider: {
        type: VOICE_PROVIDER,
        voice_id: VOICE_ID,
      },
      input: text,
      ssml: false
    },
    session_id: sessionId,
    config: {
      result_format: "mp4"
    },
    presenter_config: {
      gesture: "auto",
      stitch: true,
      fluent: true
    },
    background: { color: false }
  };

  try {

    // Llamada a al API
    const res = await fetch(`https://api.d-id.com/clips/streams/${streamId}`, {
      method: "POST",
      headers: authHdr,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("speakAvatar → Error HTTP:", res.status, errText);
      throw new Error(`speakAvatar → Fallo HTTP ${res.status}: ${errText}`);
    }
    const result = await res.json().catch(() => null);

    // Validar respuesta
    if (!result) {
      console.warn("speakAvatar → La respuesta no contiene datos útiles (esperado en streaming).");
    } else {
      console.log("speakAvatar → Respuesta D-ID:", result);
    }

  } catch (err) {
    console.error("speakAvatar → Fallo general:", err);
    throw err;
  }
}
























export async function createIdleClip() {

  console.log("Generando idle video....")

  const body = {
    script: {
      type: "text",
      ssml: true,
      input: '<break time="5000ms"/><break time="5000ms"/><break time="5000ms"/>',
      provider: {
        type: VOICE_PROVIDER,
        voice_id: VOICE_ID,
      },
    },
    presenter_id: "lily-ldwi8a_LdG",
    config: {
      fluent: true,
      pad_audio: 0,
      result_format: "webm",
      background: {color: 'false'}
    },
    driver_id: 'Zz10FZua2P'
  };

  const res = await fetch("https://api.d-id.com/clips", {
    method: "POST",
    headers: authHdr,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("createIdleClip → Error HTTP:", res.status, errText);
    throw new Error(`createIdleClip → Fallo HTTP ${res.status}: ${errText}`);
  }

  const result = await res.json();
  console.log("ID del clip creado:", result.id);
}


export async function getIdleClipById(clipId) {
  
  console.log("Recuperando idle video....")

  const res = await fetch(`https://api.d-id.com/clips/${clipId}`, {
    method: "GET",
    headers: authHdr
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("getIdleClipById → Error HTTP:", res.status, errText);
    throw new Error(`getIdleClipById → Fallo HTTP ${res.status}: ${errText}`);
  }

  const result = await res.json();
  console.log("🎥 Clip recuperado:", result.result_url);
  return result;
}