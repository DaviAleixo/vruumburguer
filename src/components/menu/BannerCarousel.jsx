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

  if (!banners || banners.length === 0) return null;

  const nextSlide = () => setCurrentIndex((i) => (i === banners.length - 1 ? 0 : i + 1));
  const prevSlide = () => setCurrentIndex((i) => (i === 0 ? banners.length - 1 : i - 1));

  return (
    <div className="w-full relative overflow-hidden">
      <div 
        className="relative w-full overflow-hidden aspect-[16/8] sm:aspect-[21/9] md:aspect-[3/1] min-h-[160px] max-h-[380px] bg-[#0d0a09]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            className="absolute inset-0 select-none"
          >
            <img
              src={banners[currentIndex]?.image_url}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Gradientes de fusão suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a09] via-transparent to-black/30 pointer-events-none" />

        {banners.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full text-white bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 transition-all shadow-lg z-10 cursor-pointer"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full text-white bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 transition-all shadow-lg z-10 cursor-pointer"
              aria-label="Próximo banner"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicadores modernos em pill animado */}
            <div className="absolute bottom-3 right-4 sm:right-6 flex items-center gap-1.5 z-10 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className="rounded-full transition-all duration-300 cursor-pointer"
                  style={{
                    width: index === currentIndex ? '18px' : '5px',
                    height: '5px',
                    background: index === currentIndex ? '#ef4444' : 'rgba(255,255,255,0.4)',
                  }}
                  aria-label={`Ir para banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}