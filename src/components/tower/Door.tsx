type DoorState = 'completed' | 'current' | 'blocked';

type DoorProps = {
  state: DoorState;
  disabled: boolean;
  onClick: () => void;
};

export default function Door({ state, disabled, onClick }: DoorProps) {
  const stateClass = state === 'current' ? 'open' : state === 'completed' ? 'completed' : 'blocked';

  return (
    <button
      type="button"
      className={`Door door door-${state} ${stateClass}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={`Puerta del piso (${state})`}
    />
  );
}
