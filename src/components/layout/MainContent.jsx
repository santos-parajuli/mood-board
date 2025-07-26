import Gallery from '../gallery/Gallery';
import Canvas from '../canvas/Canvas';
import useMoodboardStore from '@/store/moodboardStore';
import React from 'react';

const MainContent = React.forwardRef((props, ref) => {
  const { getMoodboardState } = useMoodboardStore();
  const activeMoodboard = getMoodboardState();

  return (
    <div className="flex flex-grow overflow-hidden">
      {activeMoodboard?.selectedGalleryItems.length > 0 && <Gallery canvasRef={ref} />}
      <Canvas ref={ref} />
    </div>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
