import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Floor from './Floor';
import fogOfWarImage from './assets/fog-of-war.png';

type TowerProps = {
  totalFloors: number;
  currentFloor: number;
  completedFloors: number[];
  onFloorClick: (floorNumber: number) => void;
};

export default function Tower({ totalFloors, currentFloor, completedFloors, onFloorClick }: TowerProps) {
  const floors = Array.from({ length: totalFloors }, (_, index) => totalFloors - index);
  const safeCurrentFloor = Math.min(Math.max(currentFloor, 1), totalFloors);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const towerRef = useRef<HTMLDivElement | null>(null);
  const [towerTranslateY, setTowerTranslateY] = useState(0);

  function updateTowerPosition() {
    const viewportElement = viewportRef.current;
    const towerElement = towerRef.current;

    if (!viewportElement || !towerElement) {
      return;
    }

    const activeFloorElement = towerElement.querySelector<HTMLElement>(
      `[data-floor-number="${safeCurrentFloor}"]`,
    );

    if (!activeFloorElement) {
      setTowerTranslateY(0);
      return;
    }

    const viewportHeight = viewportElement.clientHeight;
    const towerHeight = towerElement.scrollHeight;
    const activeFloorTop = activeFloorElement.offsetTop;
    const activeFloorCenter = activeFloorTop + activeFloorElement.offsetHeight * 0.58;
    const targetCenter = viewportHeight * 0.66;

    const unclampedTranslate = targetCenter - activeFloorCenter;
    const minTranslate = Math.min(0, viewportHeight - towerHeight);
    const clampedTranslate = Math.max(minTranslate, Math.min(0, unclampedTranslate));

    setTowerTranslateY(clampedTranslate);
  }

  useLayoutEffect(() => {
    updateTowerPosition();
  }, [safeCurrentFloor]);

  useEffect(() => {
    const onResize = () => {
      updateTowerPosition();
    };

    window.addEventListener('resize', onResize);

    const towerElement = towerRef.current;
    const imageElements = towerElement ? Array.from(towerElement.querySelectorAll('img')) : [];
    imageElements.forEach((imageElement) => {
      imageElement.addEventListener('load', onResize);
    });

    return () => {
      window.removeEventListener('resize', onResize);
      imageElements.forEach((imageElement) => {
        imageElement.removeEventListener('load', onResize);
      });
    };
  }, [safeCurrentFloor]);

  return (
    <section className="tower-section">
      <h1 className="tower-title">La Torre</h1>
      <img src={fogOfWarImage} alt="" className="tower-fog" aria-hidden="true" />

      <div className="tower-viewport" ref={viewportRef}>
        <div
          className="TowerContainer tower"
          ref={towerRef}
          style={{ transform: `translate3d(0, ${towerTranslateY}px, 0)` }}
        >
          {floors.map((floorNumber) => {
            const isCompleted = completedFloors.includes(floorNumber);
            const isCurrent = floorNumber === currentFloor;
            const isBlocked = floorNumber > currentFloor;

            return (
              <Floor
                key={floorNumber}
                floorNumber={floorNumber}
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
