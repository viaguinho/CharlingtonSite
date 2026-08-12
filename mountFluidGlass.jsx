import React from 'react';
import { createRoot } from 'react-dom/client';
import FluidGlass from './FluidGlass';
import TrueFocus from './TrueFocus';

const initFluidGlass = () => {
  const container = document.getElementById('artigos-media');
  if (container) {
    container.innerHTML = '';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';

    const root = createRoot(container);
    
    root.render(
      <React.StrictMode>
        <FluidGlass 
          mode="lens"
          lensProps={{
            scale: 0.25,
            ior: 1.15,
            thickness: 5,
            chromaticAberration: 0.1,
            anisotropy: 0.01  
          }}
        />
      </React.StrictMode>
    );
  }

  const topic1 = document.getElementById('truefocus-topic-1');
  if (topic1) {
    topic1.innerHTML = '';
    const root1 = createRoot(topic1);
    root1.render(
      <React.StrictMode>
        <TrueFocus 
          sentence="Impulsionado por pessoas."
          manualMode={false}
          blurAmount={4}
          borderColor="transparent"
          animationDuration={0.8}
          pauseBetweenAnimations={1}
        />
      </React.StrictMode>
    );
  }

  const topic2 = document.getElementById('truefocus-topic-2');
  if (topic2) {
    topic2.innerHTML = '';
    const root2 = createRoot(topic2);
    root2.render(
      <React.StrictMode>
        <TrueFocus 
          sentence="Entre em contato."
          manualMode={false}
          blurAmount={4}
          borderColor="transparent"
          animationDuration={0.8}
          pauseBetweenAnimations={1}
        />
      </React.StrictMode>
    );
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFluidGlass);
} else {
  initFluidGlass();
}

