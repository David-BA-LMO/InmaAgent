self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("idle-cache-v1").then(c =>
      c.add("/idle.mp4")          // ruta tras el build (usa la de Vite)
    )
  );
});