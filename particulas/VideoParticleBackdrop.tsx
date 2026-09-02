"use client";

import {
  CSSProperties,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import "./video-particle-backdrop.css";

type Particle = {
  x: number;
  y: number;
  originX: number;
  originY: number;
  drift: number;
  phase: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
};

export type VideoParticleBackdropProps = {
  /** URL do vídeo a ser exibido e usado como mapa de cores. */
  src?: string;
  poster?: string;
  className?: string;
  style?: CSSProperties;
  /** Menor número = mais partículas. 7 é um bom ponto de partida. */
  particleGap?: number;
  particleSize?: number;
  /** Quanto as partículas se afastam do vídeo, em pixels. */
  spread?: number;
  /** Atualiza as cores do vídeo a cada N frames. */
  sampleEvery?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  /** Necessário apenas para vídeos externos que autorizam CORS. */
  crossOrigin?: "anonymous" | "use-credentials";
  videoClassName?: string;
  isHovered?: boolean;
};

/**
 * Efeito original de partículas para vídeos. O canvas fica atrás do vídeo e
 * usa uma amostragem de baixa resolução do frame atual como mapa de cores.
 */
export default function VideoParticleBackdrop({
  src,
  poster,
  className = "",
  style,
  particleGap = 7,
  particleSize = 1.8,
  spread = 92,
  sampleEvery = 3,
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  crossOrigin,
  videoClassName = "",
  isHovered = false,
}: VideoParticleBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const frameRef = useRef(0);
  const inViewRef = useRef(true);
  const hoveredRef = useRef(isHovered);
  const [ready, setReady] = useState(false);
  const labelId = useId();

  useEffect(() => {
    hoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!canvas || !container || !video) return;

    const context = canvas.getContext("2d", { alpha: true });
    const sourceCanvas = document.createElement("canvas");
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!context || !sourceContext) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let sampleWidth = 0;
    let sampleHeight = 0;
    let actualSpread = 0;

    const readVideoPixels = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !sampleWidth || !sampleHeight) return;
      let pixels: Uint8ClampedArray;
      try {
        sourceContext.clearRect(0, 0, sampleWidth, sampleHeight);
        sourceContext.drawImage(video, 0, 0, sampleWidth, sampleHeight);
        pixels = sourceContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
      } catch {
        // Vídeo de outro domínio sem CORS: mantém a cor de fallback sem quebrar a animação.
        return;
      }
      const particles = particlesRef.current;
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        const pixelIndex = index * 4;
        particle.r = pixels[pixelIndex] ?? 0;
        particle.g = pixels[pixelIndex + 1] ?? 0;
        particle.b = pixels[pixelIndex + 2] ?? 0;
        // Evita que áreas quase pretas gerem um bloco denso de partículas.
        const luminance = (particle.r * 0.2126 + particle.g * 0.7152 + particle.b * 0.0722) / 255;
        particle.alpha = Math.max(0.06, luminance * 0.82);
      }
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(bounds.width));
      height = Math.max(1, Math.floor(bounds.height));
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      // Limite deliberado: mantém o efeito leve mesmo em vídeos grandes.
      const gap = Math.max(4, window.innerWidth < 640 ? particleGap * 1.45 : particleGap);
      sampleWidth = Math.max(1, Math.floor(width / gap));
      sampleHeight = Math.max(1, Math.floor(height / gap));
      sourceCanvas.width = sampleWidth;
      sourceCanvas.height = sampleHeight;

      const particles: Particle[] = [];
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          const originX = (x + 0.5) * (width / sampleWidth);
          const originY = (y + 0.5) * (height / sampleHeight);
          const edge = Math.abs(originX / width - 0.5) * 2;
          particles.push({
            x: originX,
            y: originY,
            originX,
            originY,
            drift: (0.22 + Math.random() * 0.78) * (0.35 + edge),
            phase: Math.random() * Math.PI * 2,
            r: 90,
            g: 160,
            b: 255,
            alpha: 0.25,
          });
        }
      }
      particlesRef.current = particles;
      readVideoPixels();
    };

    const paint = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      const particles = particlesRef.current;
      const t = time * 0.001;
      
      const targetSpread = (inViewRef.current && hoveredRef.current) ? spread : 0;
      actualSpread += (targetSpread - actualSpread) * 0.08;

      for (const particle of particles) {
        const pulse = 0.55 + Math.sin(t * 1.7 + particle.phase) * 0.18;
        const waveX = Math.sin(t * 0.9 + particle.phase + particle.originY * 0.015) * actualSpread * particle.drift;
        const waveY = Math.cos(t * 1.2 + particle.phase + particle.originX * 0.012) * actualSpread * 0.24 * particle.drift;
        
        particle.x += (particle.originX + waveX - particle.x) * 0.028;
        particle.y += (particle.originY + waveY - particle.y) * 0.028;
        
        // As partículas devem aparecer somente do meio para baixo
        const yRatio = particle.originY / height;
        const fade = Math.max(0, Math.min(1, (yRatio - 0.45) * 10)); // 0 no topo, transição entre 45% e 55%, 1 abaixo
        
        if (fade > 0) {
          context.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha * pulse * fade})`;
          context.beginPath();
          context.arc(particle.x, particle.y, particleSize * pulse, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalCompositeOperation = "source-over";
    };

    const draw = (time: number) => {
      animationRef.current = requestAnimationFrame(draw);
      if (!inViewRef.current) return;
      frameRef.current += 1;
      if (frameRef.current % Math.max(1, sampleEvery) === 0) readVideoPixels();
      paint(time);
    };

    const observer = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting;
    }, { threshold: 0.01 });
    observer.observe(container);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    if (!reduceMotion) animationRef.current = requestAnimationFrame(draw);
    else {
      readVideoPixels();
      paint(0);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [particleGap, particleSize, ready, sampleEvery, spread]);

  return (
    <div ref={containerRef} className={`particle-video ${isHovered ? 'is-hovered' : ''} ${className}`} style={style} aria-labelledby={labelId}>
      <canvas ref={canvasRef} className="particle-video__canvas" aria-hidden="true" />
      <div className={`particle-video__media ${videoClassName}`}>
        <video
          ref={videoRef}
          className="particle-video__video"
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline={playsInline}
          crossOrigin={crossOrigin}
          onCanPlay={() => setReady(true)}
        />
      </div>
      <span id={labelId} className="particle-video__sr-only">
        {ready ? "Vídeo com efeito de partículas" : "Carregando vídeo"}
      </span>
    </div>
  );
}
