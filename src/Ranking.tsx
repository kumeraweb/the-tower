type RankingPlayer = {
  name: string;
  floorReached: number;
};

type RankingProps = {
  players: RankingPlayer[];
  currentFloor: number;
};

export default function Ranking({ players, currentFloor }: RankingProps) {
  return (
    <aside className="RankingPanel ranking-sidebar">
      <h2>Ranking</h2>
      <ul>
        {players.map((player) => (
          <li key={player.name}>
            <span>{player.name}</span>
            <strong>Piso {player.floorReached}</strong>
          </li>
        ))}
      </ul>

      <p className="my-progress">Tú: Piso {currentFloor}</p>
    </aside>
  );
}
