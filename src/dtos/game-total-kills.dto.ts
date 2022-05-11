import { MeansOfDeath } from 'src/enums/means-of-death.enum';

export interface GameTotalKills {
  meanOfDeath: MeansOfDeath;
  amount: number;
}
