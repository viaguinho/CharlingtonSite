import { StrictMode, useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Ripple from './components/canvasui/Ripple';
import RippleDistortion from './components/ui/RippleDistortion';

function CombinedRipples() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      setVideoReady(true);
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  return (
    <Ripple trigger="click" tint={[0, 0.443, 0.89]} style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <video 
          ref={videoRef}
          src="assets/Peixes.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="comunidade-video"
          style={{ opacity: 0, position: 'absolute', inset: 0 }}
          onPlay={(e) => {
            e.currentTarget.playbackRate = 0.5;
          }}
        />
        {videoReady && (
          <RippleDistortion 
            videoElement={videoRef.current!}
            brushSize={120}
            strength={0.2}
            swirl={1}
            rings={4}
            spread={5}
            fade={3}
            spacing={15}
            dispersion={0.05}
            glint={0.5}
            tint="#0071e3"
            tintAmount={0.05}
            highlightColor="#ffffff"
            grayscale={false}
            trigger="hover"
            quality="high"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
          />
        )}
      </div>
    </Ripple>
  );
}

const communityMediaContainers = document.querySelectorAll('.comunidade-card .comunidade-media');

communityMediaContainers.forEach(container => {
  const video = container.querySelector('video') as HTMLVideoElement;
  if (video && video.src.includes('Peixes.mp4')) {
    
    // Clear the container
    container.innerHTML = '';
    
    // Ensure container has relative position to contain the absolute wrapper
    (container as HTMLElement).style.position = 'relative';

    createRoot(container).render(
      <StrictMode>
        <CombinedRipples />
      </StrictMode>
    );
  }
});
