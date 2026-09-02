import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import VideoParticleBackdrop from '../particulas/VideoParticleBackdrop';

function ParticleCardWrapper({ cardElement, videoSrc }: { cardElement: HTMLElement, videoSrc: string }) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    cardElement.addEventListener('mouseenter', handleMouseEnter);
    cardElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cardElement.removeEventListener('mouseenter', handleMouseEnter);
      cardElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cardElement]);

  return (
    <VideoParticleBackdrop
      src={videoSrc}
      isHovered={isHovered}
      particleGap={5}
      particleSize={1.8}
      spread={92}
      className="particle-video"
      videoClassName="comunidade-video"
    />
  );
}

const initParticleCard = () => {
  const card = document.getElementById('card-artigos');
  const mediaContainer = document.getElementById('artigos-media-particle');

  if (card && mediaContainer) {
    const video = mediaContainer.querySelector('video');
    const videoSrc = video?.src || "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_031045_0e1165dd-ab48-46e3-ad3d-5fe77f217647.mp4";
    
    mediaContainer.innerHTML = '';

    createRoot(mediaContainer).render(
      <StrictMode>
        <ParticleCardWrapper cardElement={card} videoSrc={videoSrc} />
      </StrictMode>
    );
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initParticleCard);
} else {
  initParticleCard();
}
