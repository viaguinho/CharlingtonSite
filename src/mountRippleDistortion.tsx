import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RippleDistortion from './components/ui/RippleDistortion';

const communityMediaContainers = document.querySelectorAll('.comunidade-card .comunidade-media');

communityMediaContainers.forEach(container => {
  const video = container.querySelector('video') as HTMLVideoElement;
  if (video && video.src.includes('Peixes.mp4')) {
    // Hide the original video visually but keep it playing so OGL can read its frames
    video.style.opacity = '0';
    
    // Ensure container has relative position to contain the absolute wrapper
    (container as HTMLElement).style.position = 'relative';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.inset = '0';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    // Put it below the content (which might have z-index 2), but above background
    wrapper.style.zIndex = '1';
    wrapper.style.pointerEvents = 'auto';
    
    container.appendChild(wrapper);

    createRoot(wrapper).render(
      <StrictMode>
        <RippleDistortion 
          videoElement={video}
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
        />
      </StrictMode>
    );
  }
});
