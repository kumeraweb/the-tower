import { useMemo, useState } from 'react';
import ChallengeView from './ChallengeView';
import TowerView from './TowerView';

export type FloorChallenge = {
  floorNumber: number;
  left: number;
  operator: '+' | '-';
  right: number;
  answer: number;
};

const TOTAL_FLOORS = 5;

function buildChallenges(totalFloors: number): FloorChallenge[] {
  return Array.from({ length: totalFloors }, (_, index) => {
    const floorNumber = index + 1;

    if (index % 2 === 0) {
      const left = 4 + floorNumber * 2;
      const right = floorNumber + 3;
      return {
        floorNumber,
        left,
        operator: '+',
        right,
        answer: left + right,
      };
    }

    const left = 10 + floorNumber * 2;
    const right = floorNumber + 1;
    return {
      floorNumber,
      left,
      operator: '-',
      right,
      answer: left - right,
    };
  });
}

export default function App() {
  const challenges = useMemo(() => buildChallenges(TOTAL_FLOORS), []);

  const [currentFloor, setCurrentFloor] = useState(1);
  const [completedFloors, setCompletedFloors] = useState<number[]>([]);
  const [isInChallenge, setIsInChallenge] = useState(false);

  const rankingPlayers = [
    { name: 'Luna', floorReached: 5 },
    { name: 'Rafa', floorReached: 4 },
    { name: 'Mia', floorReached: 3 },
  ];

  const isGameFinished = currentFloor > TOTAL_FLOORS;

  function openChallenge(floorNumber: number) {
    if (floorNumber === currentFloor && !isGameFinished) {
      setIsInChallenge(true);
    }
  }

  function handleCorrectAnswer() {
    setCompletedFloors((previousFloors) => {
      if (previousFloors.includes(currentFloor)) {
        return previousFloors;
      }
      return [...previousFloors, currentFloor];
    });

    setCurrentFloor((previousFloor) => previousFloor + 1);
    setIsInChallenge(false);
  }

  function handleIncorrectAnswer() {
    // TODO: Agregar cooldown para reintentar más adelante.
    setIsInChallenge(false);
  }
  const activeChallenge = challenges.find((challenge) => challenge.floorNumber === currentFloor) ?? null;

  return (
    <>
      {isInChallenge && activeChallenge ? (
        <ChallengeView
          challenge={activeChallenge}
          onCorrectAnswer={handleCorrectAnswer}
          onIncorrectAnswer={handleIncorrectAnswer}
        />
      ) : (
        <TowerView
          totalFloors={TOTAL_FLOORS}
          currentFloor={currentFloor}
          completedFloors={completedFloors}
          rankingPlayers={rankingPlayers}
          onFloorClick={openChallenge}
        />
      )}
    </>
  );
}
