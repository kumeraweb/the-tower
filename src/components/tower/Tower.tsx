import { CSSProperties, useEffect, useState } from 'react';
import Floor from './Floor';
import fogOfWarImage from '../../assets/fog-of-war.png';
import logoImage from '../../assets/logo.png';

type TowerProps = {
  totalFloors: number;
  currentFloor: number;
  completedFloors: number[];
  viewportHeight: number;
  floorHeight: number;
  onFloorClick: (floorNumber: number) => void;
};

const WINDOW_SIZE = 15;

export default function Tower({
  totalFloors,
  currentFloor,
  completedFloors,
  viewportHeight,
  floorHeight,
  onFloorClick,
}: TowerProps) {
  const [animateTower, setAnimateTower] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setAnimateTower(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const safeFloorHeight = Math.max(floorHeight, 1);
  const safeViewportHeight = Math.max(viewportHeight, safeFloorHeight * 2);
  const worldHeight = (totalFloors + 3) * safeFloorHeight;

  const half = Math.floor(WINDOW_SIZE / 2);
  let start = Math.max(1, currentFloor - half);
  let end = start + WINDOW_SIZE - 1;

  if (end > totalFloors) {
    end = totalFloors;
    start = Math.max(1, end - WINDOW_SIZE + 1);
  }

  const floors = Array.from({ length: end - start + 1 }, (_, index) => end - index);
  const currentFloorWorldY = (totalFloors - currentFloor + 1) * safeFloorHeight;
  const towerTranslateY = safeViewportHeight / 2 - currentFloorWorldY;
  const towerStyle = {
    height: `${worldHeight}px`,
    transform: `translate3d(-50%, ${towerTranslateY}px, 0)`,
    transition: animateTower ? undefined : 'none',
  } as CSSProperties;

  return (
    <section className="tower-section">
      <header className="tower-header">
        <img src={logoImage} alt="La Torre" className="tower-logo" />
        <img src={fogOfWarImage} alt="" className="tower-fog tower-fog-top" aria-hidden="true" />
      </header>

      <div className="tower-viewport">
        <div className="TowerContainer tower" style={towerStyle}>
          {floors.map((floorNumber) => {
            const isCompleted = completedFloors.includes(floorNumber);
            const isCurrent = floorNumber === currentFloor;
            const isBlocked = floorNumber > currentFloor;

            return (
              <Floor
                key={floorNumber}
                floorNumber={floorNumber}
                worldY={(totalFloors - floorNumber + 1) * safeFloorHeight}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isBlocked={isBlocked}
                onDoorClick={() => onFloorClick(floorNumber)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
