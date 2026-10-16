import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Award, ZoomIn, X, Sparkles, BookOpen } from 'lucide-react';

interface EduDayPosterProps {
  className?: string;
  showCaption?: boolean;
  priority?: boolean;
}

export const EduDayPoster: React.FC<EduDayPosterProps> = ({
  className = '',
  showCaption = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const posterSrc = '/assets/edu-day-jazriyya-poster.png';

  return (
    <>
      <div className={`relative group ${className}`}>
        {/* Glow backdrop */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500/20 via-maroon/20 to-navy/30 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-500" />

        <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-gray-900 to-navy shadow-2xl">
          {!imageError ? (
            <div className="relative cursor-pointer overflow-hidden" onClick={() => setIsZoomed(true)}>
              <img
                src={posterSrc}
                alt="Official Poster: EDU DAY — Jazriyya One Day Workshop"
                onError={() => setImageError(true)}
                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-[1.02]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-white font-semibold text-sm backdrop-blur-xs">
                <ZoomIn className="w-5 h-5 text-amber-400" />
                <span>Click to View Full Poster</span>
              </div>
            </div>
          ) : (
            /* High-fidelity Fallback Representation when image file is pending drop into /assets/ */
            <div className="p-6 sm:p-8 text-white flex flex-col justify-between min-h-[460px] relative overflow-hidden bg-gradient-to-br from-gray-950 via-navy to-maroon-dark">
              {/* Background decorative patterns */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-maroon/20 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
                  <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> IRTHIQA & AHSAS
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                    Official College Anniversary
                  </span>
                </div>

                <div className="text-center my-4">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-400 text-gray-950 shadow-md mb-2">
                    EDU DAY SPECIAL
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                    JAZRIYYA
                    <span className="block text-amber-400 text-lg sm:text-xl font-bold mt-1 tracking-widest">
                      ONE DAY WORKSHOP
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-sm mx-auto leading-relaxed">
                    Mastery in Tajweed Sciences & The Renowned Al-Muqaddimah Al-Jazariyyah
                  </p>
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 gap-2.5 my-4 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Date</p>
                    <p className="font-bold text-white text-xs">29 Oct 2026</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Time</p>
                    <p className="font-bold text-white text-xs">9:00 AM – 5:00 PM</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Venue</p>
                    <p className="font-bold text-white text-xs truncate">Darussalam Tharqiya</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-300 uppercase font-semibold">Reg Fee</p>
                    <p className="font-black text-amber-300 text-sm">₹313</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-gray-300">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" /> Certificate & Study Material
                </span>
                <span className="text-[10px] text-amber-400/80 italic font-mono">
                  Official Poster
                </span>
              </div>
            </div>
          )}

          {showCaption && (
            <div className="px-4 py-2.5 bg-gray-950/80 border-t border-amber-500/20 flex items-center justify-between text-xs text-gray-300">
              <span className="font-semibold flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" /> Official Event Poster
              </span>
              <span className="text-gray-400 text-[11px]">EDU DAY • 29 Oct 2026</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isZoomed && !imageError && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-gray-900/80 text-white hover:bg-maroon transition-colors"
              aria-label="Close poster preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={posterSrc}
              alt="Official Poster Full Preview: EDU DAY — Jazriyya One Day Workshop"
              className="max-h-[85vh] w-auto object-contain mx-auto rounded-lg shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </>
  );
};
