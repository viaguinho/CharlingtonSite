# Video Particle Backdrop

Componente React/TypeScript original para apresentar partículas coloridas sob um vídeo. Ele não depende de Three.js nem copia qualquer código de terceiros.

## Instalação

Copie `VideoParticleBackdrop.tsx` e `video-particle-backdrop.css` para o projeto Antigravity. Em seguida, importe e use:

```tsx
import VideoParticleBackdrop from "@/components/VideoParticleBackdrop";

export function HeroVideo() {
  return (
    <VideoParticleBackdrop
      src="/videos/demo.mp4"
      poster="/images/demo-poster.jpg"
      className="mx-auto aspect-video w-full max-w-5xl"
      particleGap={7}
      particleSize={1.8}
      spread={92}
    />
  );
}
```

## Ajustes rápidos

- `particleGap`: diminua para gerar mais partículas; aumenta o custo de renderização.
- `particleSize`: tamanho dos pontos.
- `spread`: distância do deslocamento orgânico.
- `sampleEvery`: frequência de leitura dos pixels do vídeo; `3` preserva fluidez sem ler o frame a cada quadro.

O componente limita a densidade e o DPR em dispositivos menores, pausa o desenho quando sai da tela e respeita `prefers-reduced-motion`.

Se o vídeo estiver em outro domínio, o servidor dele precisa enviar o cabeçalho CORS apropriado. Nesse caso, use `crossOrigin="anonymous"`; sem CORS o vídeo é exibido, mas as partículas usam a cor de fallback para evitar um erro no canvas.
