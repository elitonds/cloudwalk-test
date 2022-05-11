export interface GameDetailResults {
  totalKills: number;
  players: string[];
  kills: TotalKillsByPlayer[];
}

export interface TotalKillsByPlayer {
  player: string;
  total: number;
}
