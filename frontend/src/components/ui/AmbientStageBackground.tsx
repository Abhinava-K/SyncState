import React from 'react';

export interface AmbientStageBackgroundProps {
  className?: string;
  showBacklightPedestal?: boolean;
  animated?: boolean;
  /**
   * Top-Right Overhead Key Light adjustments (Edit these props or the constants below):
   * - topLightOpacity: peak brightness (default: 0.22, range: 0.05 - 0.40)
   * - topLightScale: size scale multiplier (default: 1.25)
   * - topLightBlur: blur radius in px (default: 80)
   */
  topLightOpacity?: number;
  topLightScale?: number;
  topLightBlur?: number;
}

/**
 * =========================================================================
 * TOP-RIGHT SHINE CONTROLS (EASY TUNING GUIDE)
 * =========================================================================
 * You can adjust the top-right light beam right here in code:
 * 
 * 1. BRIGHTNESS (Opacity):
 *    Change `DEFAULT_TOP_OPACITY` below (e.g. 0.22 for vivid, 0.12 for subtle, 0.32 for maximum glow)
 * 
 * 2. BREADTH & SPREAD:
 *    Change `DEFAULT_TOP_WIDTH` / `DEFAULT_TOP_MAX_WIDTH` (e.g. '100vw', '1400px')
 * 
 * 3. SOFTNESS (Blur):
 *    Change `DEFAULT_TOP_BLUR` (e.g. 80px for soft studio falloff, 60px for sharper beam)
 * 
 * 4. LIGHT POSITION:
 *    Change `-top-[16%] -right-[6%]` on the element to move the origin
 * =========================================================================
 */
const DEFAULT_TOP_OPACITY = 0.22;
const DEFAULT_TOP_SCALE = 1.25;
const DEFAULT_TOP_BLUR = 80;

/**
 * AmbientStageBackground
 * 
 * Recreates the exact Resend.com volumetric studio stage lighting:
 * 1. Top-Right Overhead Studio Softbox (Key light pouring down over 3D gears)
 * 2. Primary Anamorphic Floor Horizon (Sloping -8.5deg across lower third)
 * 3. Specular Caustic Horizon Crest (The focused shelf right below CTA buttons)
 * 4. Ultra-Crisp Core Filament (Luminous razor edge)
 * 5. Stage Floor Ground Sheen (Gentle reflective surface fading into #000000)
 * 6. 3D Subject Backlight Pedestal (Soft halo behind gears)
 * 7. Anti-Banding SVG Film Grain (Micro-dither to eliminate 8-bit monitor stepping)
 * 8. Bottom Gradient Mask (Feathers all light softly to pure #000000 without cutoffs)
 */
export const AmbientStageBackground: React.FC<AmbientStageBackgroundProps> = ({
  className = '',
  showBacklightPedestal = true,
  animated = true,
  topLightOpacity = DEFAULT_TOP_OPACITY,
  topLightScale = DEFAULT_TOP_SCALE,
  topLightBlur = DEFAULT_TOP_BLUR,
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden bg-[#000000] -z-10 select-none ${className}`}
      aria-hidden="true"
      style={{
        // Smooth bottom feathering: ensures light streaks gracefully dissolve to pure void
        maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
      }}
    >
      {/* Self-contained Keyframe Animations for Natural Breathing Light */}
      <style>{`
        @keyframes stage-horizon-drift {
          0%, 100% {
            opacity: 0.92;
            transform: rotate(-8.5deg) translateY(0px) scale(1);
          }
          50% {
            opacity: 1.0;
            transform: rotate(-8deg) translateY(-5px) scale(1.02);
          }
        }
        @keyframes stage-overhead-pulse {
          0%, 100% {
            opacity: 0.90;
            transform: translateY(0px);
          }
          50% {
            opacity: 1.0;
            transform: translateY(12px);
          }
        }
        .animate-stage-horizon {
          animation: stage-horizon-drift 14s ease-in-out infinite;
        }
        .animate-stage-overhead {
          animation: stage-overhead-pulse 16s ease-in-out infinite;
        }
      `}</style>

      {/* =========================================================================
          1. TOP-RIGHT OVERHEAD STUDIO SOFTBOX (The Downlight on the 3D subject)
          Volumetric light cone pouring down from top right towards the center
          * Broadened to 100vw / max 1400px and brightened to topLightOpacity (0.22)
          ========================================================================= */}
      <div
        className={`absolute -top-[16%] -right-[6%] w-[100vw] max-w-[1400px] h-[98vh] transform-gpu will-change-transform ${
          animated ? 'animate-stage-overhead' : ''
        }`}
        style={{
          background: `radial-gradient(ellipse 70% 70% at 76% 22%, rgba(255, 255, 255, ${topLightOpacity}) 0%, rgba(215, 230, 255, ${topLightOpacity * 0.42}) 36%, rgba(99, 102, 241, 0.035) 58%, transparent 82%)`,
          filter: `blur(${topLightBlur}px)`,
          WebkitFilter: `blur(${topLightBlur}px)`,
          transform: `scale(${topLightScale})`,
        }}
      />

      {/* =========================================================================
          2A. BROAD AMBIENT FLOOR SWEEP (-8.5deg Horizon)
          Soft volumetric horizon wash stretching from under buttons to lower right
          ========================================================================= */}
      <div
        className="absolute w-[165vw] h-[340px] -left-[30vw] bottom-[20%] transform-gpu origin-center -rotate-[8.5deg]"
        style={{
          background:
            'radial-gradient(55% 55% at 48% 50%, rgba(255, 255, 255, 0.15) 0%, rgba(190, 210, 235, 0.06) 45%, rgba(0, 0, 0, 0) 100%)',
          filter: 'blur(80px)',
          WebkitFilter: 'blur(80px)',
        }}
      />

      {/* =========================================================================
          2B. SPECULAR CAUSTIC HORIZON CREST (The Signature Studio Floor Shelf)
          The focused, clearly visible illuminated horizon line seen in Resend
          ========================================================================= */}
      <div
        className={`absolute w-[145vw] h-[80px] -left-[20vw] bottom-[24%] transform-gpu origin-center will-change-transform ${
          animated ? 'animate-stage-horizon' : '-rotate-[8.5deg]'
        }`}
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.02) 12%, rgba(255, 255, 255, 0.18) 36%, rgba(255, 255, 255, 0.28) 55%, rgba(255, 255, 255, 0.10) 74%, rgba(255, 255, 255, 0.02) 88%, transparent 100%)',
          filter: 'blur(26px)',
          WebkitFilter: 'blur(26px)',
        }}
      />

      {/* =========================================================================
          2C. ULTRA-CRISP CORE SPECULAR FILAMENT
          The bright, razor-fine horizon highlight where wall meets floor
          ========================================================================= */}
      <div
        className="absolute w-[125vw] h-[18px] -left-[10vw] bottom-[25.2%] transform-gpu origin-center -rotate-[8.5deg] opacity-85"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.0) 18%, rgba(255, 255, 255, 0.22) 40%, rgba(255, 255, 255, 0.34) 55%, rgba(255, 255, 255, 0.08) 78%, transparent 100%)',
          filter: 'blur(9px)',
          WebkitFilter: 'blur(9px)',
        }}
      />

      {/* =========================================================================
          3. STUDIO STAGE GROUND PLANE (Floor sheen below the horizon)
          Gradually fades into pitch black (#000000) at the bottom
          ========================================================================= */}
      <div
        className="absolute w-[165vw] h-[240px] -left-[30vw] bottom-[3%] transform-gpu -rotate-[8.5deg]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 40%, transparent 100%)',
          filter: 'blur(45px)',
          WebkitFilter: 'blur(45px)',
        }}
      />

      {/* =========================================================================
          4. 3D SUBJECT BACKLIGHT PEDESTAL (Soft halo directly behind gears)
          ========================================================================= */}
      {showBacklightPedestal && (
        <div
          className="absolute right-[4%] top-[15%] w-[680px] h-[680px] rounded-full transform-gpu"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, rgba(165, 180, 252, 0.04) 42%, transparent 72%)',
            filter: 'blur(85px)',
            WebkitFilter: 'blur(85px)',
          }}
        />
      )}

      {/* =========================================================================
          5. ANTI-BANDING SVG MICRO-DITHER / FILM GRAIN
          Eliminates all 8-bit monitor banding steps across black-to-light gradients
          ========================================================================= */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="stage-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.80"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#stage-noise)" />
      </svg>
    </div>
  );
};
