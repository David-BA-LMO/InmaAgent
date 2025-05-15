// src/avatar.js

const API_KEY = import.meta.env.VITE_DID_API_KEY;
const STREAM_URL = "wss://api.d-id.com/talks/streams"; // Fijo para todos

let socket = null;
let mediaSource = null;
let sourceBuffer = null;
let videoEl = null;

export async function startAvatar() {
  const AVATAR_IMAGE_URL = 'https://imgur.com/vDzLYwG.png';

  try {
    const response = await fetch('https://api.d-id.com/talks/streams', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: AVATAR_IMAGE_URL,
        config: {
          stitch: true
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error creating stream:', error);
      return;
    }

    const result = await response.json();
    console.log('Stream creado exitosamente:', result);
    return result; // Opcional: si lo necesitas para otra función
  } catch (error) {
    console.error('Error de red o excepción:', error);
  }
}
