import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BannerCarousel({ banners = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  // Se não houver nenhum banner cadastrado ou ativo, não exibe nada
  if (!banners || banners.length === 0) return null;

  const nextSlide = () => setCurrentIndex((i) => (i === banners.length - 1 ? 0 : i + 1));
  const prevSlide = () => setCurrentIndex((i) => (i === 0 ? banners.length - 1 : i - 1));

  return (
    <div className="w-full">
      <div 
        className="relative w-full overflow-hidden aspect-[16/8] sm:aspect-[21/9] md:aspect-[3/1] min-h-[160px] max-h-[380px]" 
        style={{ background: '#120e0d' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={banners[currentIndex]?.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white transition-all shadow-md z-10"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white transition-all shadow-md z-10"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicadores pill */}
            <div className="absolute bottom-3.5 right-5 flex gap-1.5 z-10">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: index === currentIndex ? '20px' : '6px',
                    height: '6px',
                    background: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}