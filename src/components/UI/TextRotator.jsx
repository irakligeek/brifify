import { useState, useEffect } from 'react';

export const TextRotator = ({ texts = [
  "Analyzing your request...",
  "Hang tight...",
  "Working on it...",
  "Processing your input..."
] }) => {
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * texts.length));
  const [isVisible, setIsVisible] = useState(true);

  const getRandomIndex = (currentIdx, length) => {
    const newIndex = Math.floor(Math.random() * (length - 1));
    // Adjust the index if it's the same as current to avoid repetition
    return newIndex >= currentIdx ? newIndex + 1 : newIndex;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false); // Start fade out
      
      // Wait for fade out, then change text
      setTimeout(() => {
        setCurrentIndex(prevIndex => getRandomIndex(prevIndex, texts.length));
        setIsVisible(true); // Start fade in
      }, 500); // Half of the total animation time
      
    }, 3000); // Total time for each text (including animations)

    return () => {
      clearInterval(interval);
    };
  }, [texts.length]);

  return (
    <span
      className={`
        transition-opacity duration-500 ease-in-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {texts[currentIndex]}
    </span>
  );
};