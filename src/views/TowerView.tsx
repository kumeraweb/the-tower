import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import Tower from '../components/tower/Tower';
import Ranking from '../components/ranking/Ranking';
import fogOfWarImage from '../assets/fog-of-war.png';
import avatarFlipImage from '../assets/avatar-flip.png';
import { RankingPlayer } from '../types/game';

type TowerViewProps = {
  totalFloors: number;
  currentFloor: number;
  completedFloors: number[];
  rankingPlayers: RankingPlayer[];
  onFloorClick: (floorNumber: number) => void;
};

export default function TowerView({
  totalFloors,
  currentFloor,
  completedFloors,
  rankingPlayers,
  onFloorClick,
}: TowerViewProps) {
  const floorIndex = Math.max(0, Math.min(currentFloor - 1, totalFloors - 1));
  const mainContentStyle = { '--floor-index': floorIndex } as CSSProperties;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    audioElement.volume = 0.12;
    audioElement.muted = isMuted;

    const tryPlay = () => {
      void audioElement.play().catch(() => {
        // Browser autoplay policy might block until user interaction.
      });
    };

    tryPlay();

    const onFirstInteraction = () => {
      tryPlay();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };

    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, [isMuted]);

  return (
    <div className="App tower-view-shell">
      <Ranking
        players={rankingPlayers}
        currentFloor={Math.min(currentFloor, totalFloors)}
        currentPlayerName="Javier"
      />

      <main className="main-content" style={mainContentStyle}>
        <audio ref={audioRef} src="/audio/tower-ambient.mp3" loop preload="auto" />
        <button
          type="button"
          className="audio-toggle-button"
          onClick={() => setIsMuted((previousValue) => !previousValue)}
          aria-label={isMuted ? 'Activar musica' : 'Silenciar musica'}
          title={isMuted ? 'Activar musica' : 'Silenciar musica'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <div className="parallax-layer parallax-sky" aria-hidden="true" />
        <div className="parallax-layer parallax-hills" aria-hidden="true" />
        <div className="parallax-layer parallax-trees" aria-hidden="true" />
        {!completedFloors.includes(1) ? (
          <img src={avatarFlipImage} alt="Avatar en el suelo" className="scene-avatar-flip" />
        ) : null}
        {currentFloor > 1 ? (
          <img src={fogOfWarImage} alt="" className="scene-fog-bottom" aria-hidden="true" />
        ) : null}

        <div className="tower-world">
        <Tower
          totalFloors={totalFloors}
          currentFloor={currentFloor}
          completedFloors={completedFloors}
          onFloorClick={onFloorClick}
        />
        </div>
      </main>
    </div>
  );
}
