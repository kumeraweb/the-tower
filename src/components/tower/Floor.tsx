import { CSSProperties } from 'react';
import Door from './Door';
import towerBase from '../../assets/tower-base.png';
import towerFloorCenter from '../../assets/tower-floor-center.png';
import towerFloorRigth from '../../assets/tower-floor-rigth.png';
import towerFloorLeft from '../../assets/tower-floor-left.png';
import avatarAImage from '../../assets/avatar-a.png';
import avatarBImage from '../../assets/avatar-b.png';
import avatarBackImage from '../../assets/avatar-back.png';
import avatarCImage from '../../assets/avatar-c.png';
import avatarFrontImage from '../../assets/avatar-front.png';
import avatarWalkImage from '../../assets/avatar-walk.png';

type FloorProps = {
  floorNumber: number;
  worldY: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isBlocked: boolean;
  onDoorClick: () => void;
};

type FloorType = 'base' | 'center' | 'right' | 'left';
type AvatarVariant = 'back' | 'front' | 'walk' | 'a' | 'b' | 'c';

function getFloorType(floorNumber: number): FloorType {
  if (floorNumber === 1) {
    return 'base';
  }

  const variantIndex = (floorNumber - 2) % 3;
  if (variantIndex === 0) {
    return 'center';
  }
  if (variantIndex === 1) {
    return 'right';
  }
  return 'left';
}

function getFloorImage(floorType: FloorType): string {
  if (floorType === 'base') {
    return towerBase;
  }
  if (floorType === 'center') {
    return towerFloorCenter;
  }
  if (floorType === 'right') {
    return towerFloorRigth;
  }
  return towerFloorLeft;
}

function getAvatarForFloor(
  floorNumber: number,
): { image: string; variant: AvatarVariant } {
  const avatarPool = [
    { image: avatarBackImage, variant: 'back' as const },
    { image: avatarFrontImage, variant: 'front' as const },
    { image: avatarWalkImage, variant: 'walk' as const },
    { image: avatarAImage, variant: 'a' as const },
    { image: avatarBImage, variant: 'b' as const },
    { image: avatarCImage, variant: 'c' as const },
  ];

  // Seleccion pseudoaleatoria estable por piso para evitar cambios en cada re-render.
  const avatarIndex = (floorNumber * 37 + 11) % avatarPool.length;
  return avatarPool[avatarIndex];
}

export default function Floor({ floorNumber, worldY, isCompleted, isCurrent, isBlocked, onDoorClick }: FloorProps) {
  const floorType = getFloorType(floorNumber);
  const floorImage = getFloorImage(floorType);
  const avatarData = getAvatarForFloor(floorNumber);
  const floorCardClassName =
    floorNumber === 1
      ? `FloorCard floor floor-base floor-type-${floorType} ${isCurrent ? 'floor-current' : ''}`
      : `FloorCard floor floor-type-${floorType} ${isCurrent ? 'floor-current' : ''}`;
  const floorImageClassName =
    floorNumber === 1 ? 'floor-image floor-image-base' : 'floor-image';
  const doorAlignment = floorType === 'left' ? 'left' : floorType === 'right' ? 'right' : 'center';
  const doorAnchorClassName = [
    'door-anchor',
    doorAlignment === 'left' ? 'anchor-left' : doorAlignment === 'right' ? 'anchor-right' : 'anchor-center',
    floorNumber === 1 ? 'anchor-base' : '',
    isCurrent ? 'is-current' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const avatarClassName = [
    'player-avatar',
    `avatar-type-${floorType}`,
    `avatar-variant-${avatarData.variant}`,
    floorNumber === 1 ? 'avatar-base' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const floorStyle = { top: `${worldY}px` } as CSSProperties;

  return (
    <article className={floorCardClassName} data-floor-number={floorNumber} style={floorStyle}>
      <img src={floorImage} alt="" className={floorImageClassName} aria-hidden="true" />
      <div className="floor-label">Piso {floorNumber}</div>
      <div className={doorAnchorClassName}>
        <Door
          state={isCompleted ? 'completed' : isCurrent ? 'current' : 'blocked'}
          onClick={onDoorClick}
          disabled={!isCurrent || isBlocked}
        />
        {isCurrent && floorNumber !== 1 ? (
          <img src={avatarData.image} alt="Avatar del jugador" className={avatarClassName} />
        ) : null}
      </div>
    </article>
  );
}
