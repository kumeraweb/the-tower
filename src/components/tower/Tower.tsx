import Floor from './Floor';
import fogOfWarImage from '../../assets/fog-of-war.png';
import logoImage from '../../assets/logo.png';

type TowerProps = {
  totalFloors: number;
  currentFloor: number;
  completedFloors: number[];
  onFloorClick: (floorNumber: number) => void;
};

export default function Tower({
  totalFloors,
  currentFloor,
  completedFloors,
  onFloorClick,
}: TowerProps) {
  const floors = Array.from({ length: totalFloors }, (_, index) => totalFloors - index);

  return (
    <section className="tower-section">
      <header className="tower-header">
        <img src={logoImage} alt="La Torre" className="tower-logo" />
        <img src={fogOfWarImage} alt="" className="tower-fog tower-fog-top" aria-hidden="true" />
      </header>

      <div className="tower-viewport">
        <div className="TowerContainer tower">
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
