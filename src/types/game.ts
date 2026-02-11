export type FloorChallenge = {
  floorNumber: number;
  left: number;
  operator: '+' | '-';
  right: number;
  answer: number;
};

export type RankingPlayer = {
  name: string;
  floorReached: number;
};
