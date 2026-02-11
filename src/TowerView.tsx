import Tower from './Tower';
import Ranking from './Ranking';

type RankingPlayer = {
  name: string;
  floorReached: number;
};

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
  return (
    <div className="App tower-view-shell">
      <Ranking players={rankingPlayers} currentFloor={Math.min(currentFloor, totalFloors)} />

      <main className="main-content">
        <Tower
          totalFloors={totalFloors}
          currentFloor={currentFloor}
          completedFloors={completedFloors}
          onFloorClick={onFloorClick}
        />
      </main>
    </div>
  );
}
