// src/contexts/FabricContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const FabricContext = createContext();

export const FabricProvider = ({ children }) => {
  const [fabricLoaded, setFabricLoaded] = useState(false);

  useEffect(() => {
    // Check if Fabric is already loaded
    if (window.fabric) {
      setFabricLoaded(true);
      return;
    }

    // Load Fabric.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js';
    script.async = true;
    
    script.onload = () => {
      if (window.fabric) {
        setFabricLoaded(true);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Fabric.js');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <FabricContext.Provider value={{ fabricLoaded }}>
      {children}
    </FabricContext.Provider>
  );
};

export const useFabric = () => {
  const context = useContext(FabricContext);
  if (context === undefined) {
    throw new Error('useFabric must be used within a FabricProvider');
  }
  return context;
};