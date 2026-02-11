import Door from './Door';
import towerBase from '../../assets/tower-base.png';
import towerFloorA from '../../assets/tower-floor-a.png';
import towerFloorB from '../../assets/tower-floor-b.png';
import avatarImage from '../../assets/avatar.png';

type FloorProps = {
  floorNumber: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isBlocked: boolean;
  onDoorClick: () => void;
};

function getFloorImage(floorNumber: number): string {
  if (floorNumber === 1) {
    return towerBase;
  }

  return floorNumber % 2 === 0 ? towerFloorA : towerFloorB;
}

export default function Floor({ floorNumber, isCompleted, isCurrent, isBlocked, onDoorClick }: FloorProps) {
  const floorType = floorNumber === 1 ? 'base' : floorNumber % 2 === 0 ? 'a' : 'b';
  const floorImage = getFloorImage(floorNumber);
  const floorCardClassName =
    floorNumber === 1
      ? `FloorCard floor floor-base floor-type-${floorType} ${isCurrent ? 'floor-current' : ''}`
      : `FloorCard floor floor-type-${floorType} ${isCurrent ? 'floor-current' : ''}`;
  const floorImageClassName =
    floorNumber === 1 ? 'floor-image floor-image-base' : 'floor-image';
  const doorAlignment = floorNumber !== 1 && floorNumber % 2 !== 0 ? 'left' : 'center';
  const doorAnchorClassName = [
    'door-anchor',
    doorAlignment === 'left' ? 'anchor-left' : 'anchor-center',
    floorNumber === 1 ? 'anchor-base' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const avatarClassName = [
    'player-avatar',
    `avatar-type-${floorType}`,
    floorNumber === 1 ? 'avatar-base' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={floorCardClassName} data-floor-number={floorNumber}>
      <img src={floorImage} alt="" className={floorImageClassName} aria-hidden="true" />
      <div className="floor-label">Piso {floorNumber}</div>
      <div className={doorAnchorClassName}>
        <Door
          state={isCompleted ? 'completed' : isCurrent ? 'current' : 'blocked'}
          onClick={onDoorClick}
          disabled={!isCurrent || isBlocked}
        />
        {isCurrent && floorNumber !== 1 ? (
          <img src={avatarImage} alt="Avatar del jugador" className={avatarClassName} />
        ) : null}
      </div>
    </article>
  );
}
