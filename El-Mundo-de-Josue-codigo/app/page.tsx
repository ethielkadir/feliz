"use client";

import Image from "next/image";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Stop = {
  id: string;
  kicker: string;
  title: string;
  icon: string;
  image: string;
  text: string;
  lat: number;
  lon: number;
  tone: string;
};

type Rotation = {
  pitch: number;
  yaw: number;
};

const stops: Stop[] = [
  {
    id: "videojuegos",
    kicker: "Parada 01",
    title: "Nuestro modo historia",
    icon: "🎮",
    image: "/photos/parada-videojuegos.png",
    lat: -24,
    lon: -82,
    tone: "#f2b56f",
    // ✨ EDITA AQUÍ el texto de la parada del control.
    text: "Escribe aquí el recuerdo, la historia o el mensaje que quieras relacionar con los videojuegos.",
  },
  {
    id: "hamburguesa",
    kicker: "Parada 02",
    title: "Nuestros antojos",
    icon: "🍔",
    image: "/photos/parada-hamburguesa.jpg",
    lat: 8,
    lon: 48,
    tone: "#ff987c",
    // ✨ EDITA AQUÍ el texto de la parada de la hamburguesa.
    text: "Escribe aquí algo sobre sus comidas favoritas, una salida especial o ese antojo que siempre comparten.",
  },
  {
    id: "descanso",
    kicker: "Parada 03",
    title: "Mi lugar seguro",
    icon: "🛏️",
    image: "/photos/parada-descanso.jpg",
    lat: 34,
    lon: 164,
    tone: "#b8a8f6",
    // ✨ EDITA AQUÍ el texto de la parada de la cama.
    text: "Escribe aquí un mensaje tranquilo y bonito: un lugar donde descansar, reír y sentirte en casa.",
  },
];

const finalPoint = {
  lat: 24,
  lon: -8,
};

const rainHearts = Array.from({ length: 112 }, (_, index) => ({
  id: index,
  left: (index * 47 + 3) % 100,
  delay: -((index * 0.43) % 8),
  duration: 4.1 + ((index * 19) % 36) / 10,
  size: 15 + ((index * 23) % 48),
  drift: -105 + ((index * 37) % 210),
  opacity: 0.48 + ((index * 17) % 48) / 100,
  layer: index % 5 === 0 ? "front" : "back",
  glyph: index % 7 === 0 ? "♡" : "♥",
}));

const burstHearts = Array.from({ length: 40 }, (_, index) => ({
  id: index,
  angle: index * 9,
  distance: 180 + (index % 7) * 38,
  size: 17 + (index % 5) * 8,
}));

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export default function Home() {
  const [started, setStarted] = useState(false);
  const [introLeaving, setIntroLeaving] = useState(false);
  const [activeStop, setActiveStop] = useState<Stop | null>(null);
  const [visited, setVisited] = useState<string[]>([]);
  const [finalOpen, setFinalOpen] = useState(false);
  const [rotation, setRotation] = useState<Rotation>({ pitch: -7, yaw: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [hasTurned, setHasTurned] = useState(false);
  const dragRef = useRef({ active: false, x: 0, y: 0 });

  const progress = useMemo(
    () => Math.round((visited.length / stops.length) * 100),
    [visited],
  );

  const projectPoint = (lat: number, lon: number) => {
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
  };

  const openStop = (stop: Stop) => {
    setActiveStop(stop);
    setVisited((current) =>
      current.includes(stop.id) ? current : [...current, stop.id],
    );
  };

  const rotateWorld = (yawDelta: number, pitchDelta = 0) => {
    setHasTurned(true);
    setRotation((current) => ({
      pitch: clamp(current.pitch + pitchDelta, -48, 48),
      yaw: current.yaw + yawDelta,
    }));
  };

  const enterWorld = () => {
    setIntroLeaving(true);
    window.setTimeout(() => setStarted(true), 720);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
    };
    setIsDragging(true);
    setHasTurned(true);
  };

  const moveWorld = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };

    setRotation((current) => ({
      yaw: current.yaw + deltaX * 0.36,
      pitch: clamp(current.pitch - deltaY * 0.24, -48, 48),
    }));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current.active && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveStop(null);
        setFinalOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      !started || activeStop || finalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [started, activeStop, finalOpen]);

  useEffect(() => {
    if (!started || isDragging || rotationPaused || activeStop || finalOpen) return;

    const timer = window.setInterval(() => {
      setRotation((current) => ({
        ...current,
        yaw: current.yaw + 0.18,
      }));
    }, 70);

    return () => window.clearInterval(timer);
  }, [started, isDragging, rotationPaused, activeStop, finalOpen]);

  const textureShift = `${rotation.yaw * 1.55}px`;
  const cloudShift = `${rotation.yaw * -0.82}px`;
  const finalProjection = projectPoint(finalPoint.lat, finalPoint.lon);

  return (
    <main
      className={`dream-page ${started ? "has-started" : ""} ${
        activeStop ? "memory-is-open" : ""
      } ${
        finalOpen ? "final-is-open" : ""
      }`}
    >
      {!started && (
        <section
          className={`intro-gate ${introLeaving ? "is-leaving" : ""}`}
          aria-label="Portada"
        >
          <div className="intro-nebula intro-nebula-one" />
          <div className="intro-nebula intro-nebula-two" />
          <div className="intro-cosmos" aria-hidden="true">
            <span className="intro-planet intro-planet-ringed">
              <i />
            </span>
            <span className="intro-planet intro-planet-violet" />
            <span className="intro-planet intro-planet-rose" />
            <span className="intro-galaxy" />
            <span className="intro-comet intro-comet-one" />
            <span className="intro-comet intro-comet-two" />
          </div>
          <div className="intro-stars" />
          <div className="intro-orbit" aria-hidden="true">
            <span />
          </div>
          <div className="intro-mini-world" aria-hidden="true">
            <div />
          </div>
          <div className="intro-content">
            <p className="intro-kicker">
              <span>✦</span> Una aventura hecha con amor <span>✦</span>
            </p>
            <h1>
              Bienvenido al mundo
              <span>de Josué</span>
            </h1>
            <p>
              Hay un universo de momentos esperando por ti. Gíralo, recórrelo
              y descubre lo que guarda en su corazón.
            </p>
            <button onClick={enterWorld}>
              <span>Iniciar el viaje</span>
              <i>→</i>
            </button>
          </div>
          <p className="intro-footer">Hecho para una persona inmensamente especial ♡</p>
        </section>
      )}

      <div className="deep-space" aria-hidden="true">
        <span className="nebula-ribbon nebula-ribbon-one" />
        <span className="nebula-ribbon nebula-ribbon-two" />
        <span className="far-planet planet-ringed">
          <i className="planet-ring" />
          <i className="planet-glow" />
        </span>
        <span className="far-planet planet-amethyst">
          <i className="planet-glow" />
        </span>
        <span className="far-planet planet-ocean">
          <i className="planet-glow" />
        </span>
        <span className="far-planet planet-coral" />
        <span className="galaxy-arc" />
        <span className="star-cluster star-cluster-left" />
        <span className="star-cluster star-cluster-right" />
      </div>
      <div className="sky-glow sky-glow-one" />
      <div className="sky-glow sky-glow-two" />
      <div className="stars" aria-hidden="true" />
      <div className="orbit orbit-one" aria-hidden="true" />
      <div className="orbit orbit-two" aria-hidden="true" />
      <div className="space-dust" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <div className="shooting-star shooting-star-one" aria-hidden="true" />
      <div className="shooting-star shooting-star-two" aria-hidden="true" />
      <div className="shooting-star shooting-star-three" aria-hidden="true" />
      <div className="shooting-star shooting-star-four" aria-hidden="true" />
      <div className="shooting-star shooting-star-five" aria-hidden="true" />
      <div className="small-moon moon-left" aria-hidden="true" />
      <div className="small-moon moon-right" aria-hidden="true" />

      <header className="world-hud">
        <div className="hud-brand">
          <span>J</span>
          <div>
            <small>Explorando</small>
            <strong>El mundo de Josué</strong>
          </div>
        </div>
        <div className="journey-status" aria-label="Progreso del recorrido">
          <span>{visited.length}/3 recuerdos descubiertos</span>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <section className="world-zone" aria-label="Mundo interactivo">
        <div className="cosmic-cloud cloud-left" aria-hidden="true" />
        <div className="cosmic-cloud cloud-right" aria-hidden="true" />

        <div
          className={`globe-stage ${isDragging ? "is-dragging" : ""}`}
          onPointerDown={beginDrag}
          onPointerMove={moveWorld}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") rotateWorld(-18);
            if (event.key === "ArrowRight") rotateWorld(18);
            if (event.key === "ArrowUp") rotateWorld(0, 10);
            if (event.key === "ArrowDown") rotateWorld(0, -10);
          }}
          role="application"
          aria-label="Globo de Josué. Arrastra para girarlo."
          tabIndex={0}
        >
          <div className="globe-shadow" />
          <div className="atmosphere atmosphere-outer" />
          <div className="atmosphere atmosphere-inner" />

          <div
            className="globe"
            style={
              {
                "--texture-shift": textureShift,
                "--cloud-shift": cloudShift,
                "--globe-tilt": `${rotation.pitch * -0.08}deg`,
              } as CSSProperties
            }
          >
            <div className="ocean-depth" />
            <div className="planet-texture" />
            <div className="terrain terrain-one" />
            <div className="terrain terrain-two" />
            <div className="terrain terrain-three" />
            <div className="terrain terrain-four" />
            <div className="globe-grid">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="cloud-belt" />
            <div className="globe-gloss" />
            <div className="night-side" />
          </div>

          {stops.map((stop, index) => {
            const position = projectPoint(stop.lat, stop.lon);
            const isVisited = visited.includes(stop.id);
            return (
              <button
                className={`globe-stop ${isVisited ? "is-visited" : ""}`}
                key={stop.id}
                onClick={() => openStop(stop)}
                onPointerEnter={() => setRotationPaused(true)}
                onPointerLeave={() => setRotationPaused(false)}
                onPointerDown={() => setRotationPaused(true)}
                onFocus={() => setRotationPaused(true)}
                onBlur={() => setRotationPaused(false)}
                aria-label={`Abrir ${stop.title}`}
                style={
                  {
                    left: `${position.left}%`,
                    top: `${position.top}%`,
                    opacity: position.opacity,
                    zIndex: position.zIndex,
                    pointerEvents: position.isFront ? "auto" : "none",
                    "--point-scale": position.scale,
                    "--stop-tone": stop.tone,
                    "--pin-delay": `${index * -0.55}s`,
                  } as CSSProperties
                }
              >
                <span className="pin-pulse" />
                <span className="pin-stem" />
                <span className="pin-orb">
                  <span aria-hidden="true">{stop.icon}</span>
                </span>
                <span className="pin-copy">
                  <small>{stop.kicker}</small>
                  <strong>{stop.title}</strong>
                  <em>{isVisited ? "Descubierto ✓" : "Presiona para abrir"}</em>
                </span>
                <span className="pin-number">0{index + 1}</span>
              </button>
            );
          })}

          <button
            className="globe-heart"
            onClick={() => setFinalOpen(true)}
            onPointerEnter={() => setRotationPaused(true)}
            onPointerLeave={() => setRotationPaused(false)}
            onPointerDown={() => setRotationPaused(true)}
            onFocus={() => setRotationPaused(true)}
            onBlur={() => setRotationPaused(false)}
            aria-label="Abrir el gran final"
            style={
              {
                left: `${finalProjection.left}%`,
                top: `${finalProjection.top}%`,
                opacity: finalProjection.opacity,
                zIndex: finalProjection.zIndex + 3,
                pointerEvents: finalProjection.isFront ? "auto" : "none",
                "--point-scale": finalProjection.scale,
              } as CSSProperties
            }
          >
            <span className="heart-aura" />
            <span className="heart-gem">♥</span>
            <span className="heart-copy">
              <small>El centro de mi universo</small>
              <strong>El gran final</strong>
              <em>Presiona el corazón</em>
            </span>
          </button>
        </div>

        <div className="world-controls">
          <button onClick={() => rotateWorld(-42)} aria-label="Girar el mundo a la izquierda">
            ↶
          </button>
          <p className={hasTurned ? "has-turned" : ""}>
            <span className="drag-symbol">↔</span>
            {hasTurned ? "Sigue explorando el planeta" : "Arrastra para darle la vuelta"}
          </p>
          <button onClick={() => rotateWorld(42)} aria-label="Girar el mundo a la derecha">
            ↷
          </button>
        </div>

        <p className="world-note">
          Hay recuerdos alrededor de todo el mundo
          <span>•</span>
          gira para encontrarlos
        </p>
      </section>

      <footer>
        <span>J + ♡</span>
        <p>Un mundo entero para alguien inmensamente especial.</p>
      </footer>

      {activeStop && (
        <div
          className="memory-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="memory-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveStop(null);
          }}
          style={{ "--memory-tone": activeStop.tone } as CSSProperties}
        >
          <article className="memory-card">
            <button
              className="close-button"
              onClick={() => setActiveStop(null)}
              aria-label="Cerrar recuerdo"
            >
              ×
            </button>
            <div className="memory-photo-wrap">
              <div className="photo-tape tape-left" />
              <div className="photo-tape tape-right" />
              <Image
                src={activeStop.image}
                alt={activeStop.title}
                fill
                sizes="(max-width: 620px) 100vw, 55vw"
                unoptimized
              />
              <span className="photo-shine" />
            </div>
            <div className="memory-content">
              <p>{activeStop.kicker}</p>
              <h2 id="memory-title">{activeStop.title}</h2>
              <div className="gold-line" />
              <p className="editable-copy">{activeStop.text}</p>
              <span className="memory-sign">Un rincón de nuestro mundo ♡</span>
            </div>
            <span className="card-icon" aria-hidden="true">
              {activeStop.icon}
            </span>
          </article>
        </div>
      )}

      {finalOpen && (
        <div className="finale" role="dialog" aria-modal="true">
          <div className="finale-sky" />
          <div className="pink-world" aria-hidden="true">
            <div className="pink-world-map" />
            <div className="pink-world-clouds" />
            <div className="pink-world-lines" />
            <div className="pink-world-light" />
          </div>
          <div className="finale-vignette" />

          <div className="heart-rain" aria-hidden="true">
            {rainHearts.map((heart) => (
              <span
                className={heart.layer}
                key={heart.id}
                style={
                  {
                    "--heart-left": `${heart.left}%`,
                    "--heart-delay": `${heart.delay}s`,
                    "--heart-duration": `${heart.duration}s`,
                    "--heart-size": `${heart.size}px`,
                    "--heart-drift": `${heart.drift}px`,
                    "--heart-opacity": heart.opacity,
                  } as CSSProperties
                }
              >
                {heart.glyph}
              </span>
            ))}
          </div>

          <div className="burst" aria-hidden="true">
            <span className="explosion-core">♥</span>
            {burstHearts.map((heart) => (
              <i
                key={heart.id}
                style={
                  {
                    "--burst-angle": `${heart.angle}deg`,
                    "--burst-distance": `${heart.distance}px`,
                    "--burst-size": `${heart.size}px`,
                  } as CSSProperties
                }
              >
                ♥
              </i>
            ))}
          </div>

          <button
            className="final-close"
            onClick={() => setFinalOpen(false)}
            aria-label="Cerrar el gran final"
          >
            Volver al mundo <span>×</span>
          </button>

          <section className="final-message">
            <p className="final-kicker">
              <span>✦</span> El centro de mi universo <span>✦</span>
            </p>
            <h2>
              Siempre has
              <span>estado tú</span>
            </h2>
            <div className="final-photo-wrap">
              <div className="final-halo halo-one" />
              <div className="final-halo halo-two" />
              <div className="final-photo">
                <Image
                  src="/photos/show-final.png"
                  alt="Nuestro comienzo"
                  width={373}
                  height={245}
                  sizes="(max-width: 620px) 84vw, 500px"
                  unoptimized
                />
              </div>
              <span className="photo-caption">donde todo comenzó ♡</span>
            </div>
            {/* ✨ EDITA AQUÍ el texto especial del show final. */}
            <p className="final-copy">
              Escribe aquí tu mensaje final. Este es el lugar para contar por
              qué esta foto, esta historia y esta persona viven en el corazón
              de tu mundo.
            </p>
            <span className="signature">Con todo mi corazón, para siempre ♡</span>
          </section>
        </div>
      )}
    </main>
  );
}
