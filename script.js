/*
  EL MUNDO DE JOSUÉ — ARCHIVO EDITABLE

  Para cambiar los textos de cada recuerdo, edita "text" en las tres
  paradas de abajo. Para cambiar las fotos, reemplaza los archivos dentro
  de la carpeta "photos" conservando sus nombres.
*/

const stops = [
  {
    id: "videojuegos",
    kicker: "Parada 01",
    title: "Nuestra Historia",
    icon: "🎮",
    image: "photos/parada-videojuegos.png",
    lat: -24,
    lon: -82,
    tone: "#f2b56f",

    // ✨ EDITA AQUÍ EL TEXTO DE LA PARADA DEL CONTROL
    text: "Una vez más, un mes mas, y una historia inmensa por delante, eso es lo que tenemos tu y yo, una historia que se que será la mejor historia que alguien pueda contar en la vida, y esa historia que no se encuentran 2 veces en una misma vida.",
  },
  {
    id: "hamburguesa",
    kicker: "Parada 02",
    title: "Nuestros Sueños",
    icon: "🍔",
    image: "photos/parada-hamburguesa.jpg",
    lat: 8,
    lon: 48,
    tone: "#ff987c",

    // ✨ EDITA AQUÍ EL TEXTO DE LA PARADA DE LA HAMBURGUESA
    text: "Nuestras salidas son lo maximo, extraño salir contigo, te extraño a ti, recuerdo nuestras primeras salidas, muy hermosas y divertidas, quiero tener mas salidas asi unicas, hermosas y preciosas contigo, que nuestras salidas nunca acaben, quiero conocer el mundo contigo, quiero que seas mi compañera de viaje para todos lados, mi compañera de viaje.",
  },
  {
    id: "descanso",
    kicker: "Parada 03",
    title: "Mi lugar seguro",
    icon: "🛏️",
    image: "photos/parada-descanso.jpg",
    lat: 34,
    lon: 164,
    tone: "#b8a8f6",

    // ✨ EDITA AQUÍ EL TEXTO DE LA PARADA DE LA CAMA
    text: "La ultima parada antes del gran final, mi lugar seguro, eso es lo que eres tu, ese lugar donde puedo estar en paz, donde me encanta estar, a pesar de las peleitas y demas, eso es superficial, lo que realmente importa eres tu, eres ese lugar donde a pesar de todo puedo estar en paz, donde no haya ni un dia donde no este en paz, al final del dia, mi amor por ti siempre es mas grande que cualquier cosa, tu eres mi vida y mi mundo y quiero que tengas eso siempre presente mi vida <3.",
  },
];

const finalPoint = { lat: 24, lon: -8 };
const page = document.querySelector("#dreamPage");
const introGate = document.querySelector("#introGate");
const startButton = document.querySelector("#startButton");
const globeStage = document.querySelector("#globeStage");
const globe = document.querySelector("#globe");
const stopsLayer = document.querySelector("#stopsLayer");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const dragHint = document.querySelector("#dragHint");
const dragText = document.querySelector("#dragText");
const memoryOverlay = document.querySelector("#memoryOverlay");
const finale = document.querySelector("#finale");

let started = false;
let activeStop = null;
let finalOpen = false;
let rotationPaused = false;
let isDragging = false;
let hasTurned = false;
let rotation = { pitch: -7, yaw: 0 };
let drag = { x: 0, y: 0 };
const visited = new Set();
const stopButtons = new Map();

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function projectPoint(lat, lon) {
  const latitude = (lat * Math.PI) / 180;
  const longitude = ((lon + rotation.yaw) * Math.PI) / 180;
  const pitch = (rotation.pitch * Math.PI) / 180;

  const x = Math.cos(latitude) * Math.sin(longitude);
  const baseY = -Math.sin(latitude);
  const baseZ = Math.cos(latitude) * Math.cos(longitude);
  const y = baseY * Math.cos(pitch) - baseZ * Math.sin(pitch);
  const z = baseY * Math.sin(pitch) + baseZ * Math.cos(pitch);
  const depth = (z + 1) / 2;

  return {
    left: 50 + x * 45.5,
    top: 50 + y * 45.5,
    scale: 0.64 + depth * 0.42,
    opacity: clamp((z + 0.17) * 2.15, 0, 1),
    zIndex: Math.round(20 + depth * 70),
    isFront: z > -0.12,
  };
}

function createStopButton(stop, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "globe-stop";
  button.setAttribute("aria-label", `Abrir ${stop.title}`);
  button.style.setProperty("--stop-tone", stop.tone);
  button.style.setProperty("--pin-delay", `${index * -0.55}s`);
  button.innerHTML = `
    <span class="pin-pulse"></span>
    <span class="pin-stem"></span>
    <span class="pin-orb"><span aria-hidden="true">${stop.icon}</span></span>
    <span class="pin-copy">
      <small>${stop.kicker}</small>
      <strong>${stop.title}</strong>
      <em>Presiona para abrir</em>
    </span>
    <span class="pin-number">0${index + 1}</span>
  `;

  button.addEventListener("click", () => openStop(stop));
  button.addEventListener("pointerenter", () => (rotationPaused = true));
  button.addEventListener("pointerleave", () => (rotationPaused = false));
  button.addEventListener("focus", () => (rotationPaused = true));
  button.addEventListener("blur", () => (rotationPaused = false));
  stopsLayer.appendChild(button);
  stopButtons.set(stop.id, button);
}

stops.forEach(createStopButton);

const finalButton = document.createElement("button");
finalButton.type = "button";
finalButton.className = "globe-heart";
finalButton.setAttribute("aria-label", "Abrir el gran final");
finalButton.innerHTML = `
  <span class="heart-aura"></span>
  <span class="heart-gem">♥</span>
  <span class="heart-copy">
    <small>El centro de mi universo</small>
    <strong>El gran final</strong>
    <em>Presiona el corazón</em>
  </span>
`;
finalButton.addEventListener("click", openFinale);
finalButton.addEventListener("pointerenter", () => (rotationPaused = true));
finalButton.addEventListener("pointerleave", () => (rotationPaused = false));
finalButton.addEventListener("focus", () => (rotationPaused = true));
finalButton.addEventListener("blur", () => (rotationPaused = false));
stopsLayer.appendChild(finalButton);

function updateWorld() {
  globe.style.setProperty("--texture-shift", `${rotation.yaw * 1.55}px`);
  globe.style.setProperty("--cloud-shift", `${rotation.yaw * -0.82}px`);
  globe.style.setProperty("--globe-tilt", `${rotation.pitch * -0.08}deg`);

  stops.forEach((stop) => {
    const position = projectPoint(stop.lat, stop.lon);
    const button = stopButtons.get(stop.id);
    button.style.left = `${position.left}%`;
    button.style.top = `${position.top}%`;
    button.style.opacity = position.opacity;
    button.style.zIndex = position.zIndex;
    button.style.pointerEvents = position.isFront ? "auto" : "none";
    button.style.setProperty("--point-scale", position.scale);
  });

  const finalPosition = projectPoint(finalPoint.lat, finalPoint.lon);
  finalButton.style.left = `${finalPosition.left}%`;
  finalButton.style.top = `${finalPosition.top}%`;
  finalButton.style.opacity = finalPosition.opacity;
  finalButton.style.zIndex = finalPosition.zIndex + 3;
  finalButton.style.pointerEvents = finalPosition.isFront ? "auto" : "none";
  finalButton.style.setProperty("--point-scale", finalPosition.scale);
}

function rotateWorld(yawDelta, pitchDelta = 0) {
  hasTurned = true;
  rotation.yaw += yawDelta;
  rotation.pitch = clamp(rotation.pitch + pitchDelta, -48, 48);
  dragHint.classList.add("has-turned");
  dragText.textContent = "Sigue explorando el planeta";
  updateWorld();
}

function updateProgress() {
  progressText.textContent = `${visited.size}/3 recuerdos descubiertos`;
  progressBar.style.width = `${Math.round((visited.size / stops.length) * 100)}%`;
}

function setPageLock() {
  document.body.style.overflow =
    !started || activeStop || finalOpen ? "hidden" : "";
}

function openStop(stop) {
  activeStop = stop;
  visited.add(stop.id);

  const button = stopButtons.get(stop.id);
  button.classList.add("is-visited");
  button.querySelector(".pin-copy em").textContent = "Descubierto ✓";
  updateProgress();

  memoryOverlay.style.setProperty("--memory-tone", stop.tone);
  document.querySelector("#memoryImage").src = stop.image;
  document.querySelector("#memoryImage").alt = stop.title;
  document.querySelector("#memoryKicker").textContent = stop.kicker;
  document.querySelector("#memoryTitle").textContent = stop.title;
  document.querySelector("#memoryText").textContent = stop.text;
  document.querySelector("#memoryIcon").textContent = stop.icon;

  memoryOverlay.hidden = false;
  page.classList.add("memory-is-open");
  setPageLock();
  document.querySelector("#memoryClose").focus();
}

function closeMemory() {
  activeStop = null;
  memoryOverlay.hidden = true;
  page.classList.remove("memory-is-open");
  setPageLock();
}

function openFinale() {
  finalOpen = true;
  finale.hidden = false;
  page.classList.add("final-is-open");
  setPageLock();
  document.querySelector("#finalClose").focus();
}

function closeFinale() {
  finalOpen = false;
  finale.hidden = true;
  page.classList.remove("final-is-open");
  setPageLock();
}

startButton.addEventListener("click", () => {
  introGate.classList.add("is-leaving");
  window.setTimeout(() => {
    started = true;
    page.classList.add("has-started");
    introGate.hidden = true;
    setPageLock();
  }, 720);
});

document.querySelector("#memoryClose").addEventListener("click", closeMemory);
document.querySelector("#finalClose").addEventListener("click", closeFinale);
document.querySelector("#turnLeft").addEventListener("click", () => rotateWorld(-42));
document.querySelector("#turnRight").addEventListener("click", () => rotateWorld(42));

memoryOverlay.addEventListener("pointerdown", (event) => {
  if (event.target === memoryOverlay) closeMemory();
});

globeStage.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  globeStage.setPointerCapture(event.pointerId);
  isDragging = true;
  hasTurned = true;
  drag = { x: event.clientX, y: event.clientY };
  globeStage.classList.add("is-dragging");
});

globeStage.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const deltaX = event.clientX - drag.x;
  const deltaY = event.clientY - drag.y;
  drag = { x: event.clientX, y: event.clientY };
  rotation.yaw += deltaX * 0.36;
  rotation.pitch = clamp(rotation.pitch - deltaY * 0.24, -48, 48);
  dragHint.classList.add("has-turned");
  dragText.textContent = "Sigue explorando el planeta";
  updateWorld();
});

function endDrag(event) {
  if (!isDragging) return;
  if (globeStage.hasPointerCapture(event.pointerId)) {
    globeStage.releasePointerCapture(event.pointerId);
  }
  isDragging = false;
  globeStage.classList.remove("is-dragging");
}

globeStage.addEventListener("pointerup", endDrag);
globeStage.addEventListener("pointercancel", endDrag);

globeStage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") rotateWorld(-18);
  if (event.key === "ArrowRight") rotateWorld(18);
  if (event.key === "ArrowUp") rotateWorld(0, 10);
  if (event.key === "ArrowDown") rotateWorld(0, -10);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (activeStop) closeMemory();
  if (finalOpen) closeFinale();
});

for (let index = 0; index < 18; index += 1) {
  document.querySelector("#spaceDust").appendChild(document.createElement("i"));
}

for (let index = 0; index < 112; index += 1) {
  const heart = document.createElement("span");
  heart.className = index % 5 === 0 ? "front" : "back";
  heart.textContent = index % 7 === 0 ? "♡" : "♥";
  heart.style.setProperty("--heart-left", `${(index * 47 + 3) % 100}%`);
  heart.style.setProperty("--heart-delay", `${-((index * 0.43) % 8)}s`);
  heart.style.setProperty("--heart-duration", `${4.1 + ((index * 19) % 36) / 10}s`);
  heart.style.setProperty("--heart-size", `${15 + ((index * 23) % 48)}px`);
  heart.style.setProperty("--heart-drift", `${-105 + ((index * 37) % 210)}px`);
  heart.style.setProperty("--heart-opacity", 0.48 + ((index * 17) % 48) / 100);
  document.querySelector("#heartRain").appendChild(heart);
}

for (let index = 0; index < 40; index += 1) {
  const heart = document.createElement("i");
  heart.textContent = "♥";
  heart.style.setProperty("--burst-angle", `${index * 9}deg`);
  heart.style.setProperty("--burst-distance", `${180 + (index % 7) * 38}px`);
  heart.style.setProperty("--burst-size", `${17 + (index % 5) * 8}px`);
  document.querySelector("#heartBurst").appendChild(heart);
}

window.setInterval(() => {
  if (!started || isDragging || rotationPaused || activeStop || finalOpen) return;
  rotation.yaw += 0.18;
  updateWorld();
}, 70);

updateWorld();
updateProgress();
setPageLock();
