import React from 'react';
import PlaceholderIcon from '@/assets/svg/image-generation/placeholder.svg?react';

/**
 * Image generation: pending/running placeholder
 * - Design: center placeholder icon + ring progress
 */
const ImageGenerationPendingView: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#FAFAFA]">
      <div className="relative w-[72px] h-[72px]">
        {/* Grey base ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E8E8E8]" />

        {/* Colored arc (conic-gradient + mask ring, then rotate) */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background:
              'conic-gradient(from 90deg, #CDD9C8 0deg, #7BADFF 26.97deg, #4218FF 68.37deg, #FFB54F 116.16deg, #FFF4A7 163.56deg, #CDD9C8 180deg, transparent 180deg 360deg)',
            // Show a ring, not a filled circle
            WebkitMask:
              'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          }}
        />

        {/* Center placeholder icon */}
        <div className="absolute inset-0 flex items-center justify-center text-[#CCC]">
          <PlaceholderIcon />
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationPendingView;


