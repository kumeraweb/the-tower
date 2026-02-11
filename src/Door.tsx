type DoorState = 'completed' | 'current' | 'blocked';

type DoorProps = {
  state: DoorState;
  alignment: 'center' | 'left';
  isBaseFloor: boolean;
  disabled: boolean;
  onClick: () => void;
};

export default function Door({ state, alignment, isBaseFloor, disabled, onClick }: DoorProps) {
  const stateClass = state === 'current' ? 'open' : state === 'completed' ? 'completed' : 'blocked';
  const alignmentClass = alignment === 'left' ? 'align-left' : 'align-center';
  const baseClass = isBaseFloor ? 'base-door' : '';

  return (
    <button
      type="button"
      className={`Door door door-${state} ${stateClass} ${alignmentClass} ${baseClass}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={`Puerta del piso (${state})`}
    />
  );
}
