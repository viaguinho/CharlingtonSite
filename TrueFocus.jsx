import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TrueFocus = ({
  sentence = "True Focus",
  manualMode = false,
  blurAmount = 5,
  borderColor = "#2502b3",
  animationDuration = 0.5,
  pauseBetweenAnimations = 1,
}) => {
  const words = sentence.split(" ");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!manualMode) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
      }, (animationDuration + pauseBetweenAnimations) * 1000);

      return () => clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  const handleMouseEnter = (index) => {
    if (manualMode) {
      setLastActiveIndex(currentIndex);
      setCurrentIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (manualMode) {
      setCurrentIndex(lastActiveIndex !== null ? lastActiveIndex : 0);
    }
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: '0.25em', flexWrap: 'wrap' }}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <motion.span
            key={index}
            style={{
              filter: isActive ? "blur(0px)" : `blur(${blurAmount}px)`,
              opacity: isActive ? 1 : 0.6,
              transition: `filter ${animationDuration}s ease, opacity ${animationDuration}s ease`,
              cursor: manualMode ? "pointer" : "default",
              display: 'inline-block'
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </motion.span>
        );
      })}
    </div>
  );
};

export default TrueFocus;
