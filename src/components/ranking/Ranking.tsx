import { useState } from 'react';
import { RankingPlayer } from '../../types/game';

type RankingProps = {
  players: RankingPlayer[];
  currentFloor: number;
  currentPlayerName?: string;
};

export default function Ranking({
  players,
  currentFloor,
  currentPlayerName = 'Tú',
}: RankingProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <aside className="RankingPanel ranking-sidebar ranking-desktop">
        <h2>Ranking</h2>
        <ul>
          {players.map((player) => (
            <li key={player.name}>
              <span>{player.name}</span>
              <strong>Piso {player.floorReached}</strong>
            </li>
          ))}
        </ul>

        <p className="my-progress">{currentPlayerName}: Piso {currentFloor}</p>
      </aside>

      <section className="ranking-mobile-bar" aria-label="Barra de juego">
        <span className="ranking-mobile-item">{currentPlayerName}</span>
        <span className="ranking-mobile-item">Piso {currentFloor}</span>
        <button
          type="button"
          className="ranking-mobile-button"
          onClick={() => setIsModalOpen(true)}
        >
          Ranking
        </button>
        <button type="button" className="ranking-mobile-button profile-button">
          Perfil
        </button>
      </section>

      {isModalOpen ? (
        <section className="ranking-modal-overlay" role="dialog" aria-modal="true">
          <article className="ranking-modal-card">
            <header className="ranking-modal-header">
              <h3>Ranking</h3>
              <button
                type="button"
                className="ranking-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar ranking"
              >
                x
              </button>
            </header>

            <ul className="ranking-modal-list">
              {players.map((player) => (
                <li key={player.name}>
                  <span>{player.name}</span>
                  <strong>Piso {player.floorReached}</strong>
                </li>
              ))}
            </ul>

            <p className="my-progress">{currentPlayerName}: Piso {currentFloor}</p>
          </article>
        </section>
      ) : null}
    </>
  );
}
