import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { GameDetailResults } from './dtos/game-detail-results.dto';

@Injectable()
export class AppService {
  async processData() {
    const file = createReadStream(join(process.cwd(), 'qgames.log'));

    const rl = readline.createInterface({
      input: file,
      crlfDelay: Infinity,
    });

    const gameDetailList = new Map<string, GameDetailResults>();
    let gameNumber = 0;
    let currentGame = '';

    for await (const line of rl) {
      if (line.includes('InitGame')) {
        gameNumber++;
        currentGame = `game_${gameNumber}`;
        const gameDetail: GameDetailResults = {
          kills: [],
          players: [],
          totalKills: 0,
        };
        gameDetailList.set(currentGame, gameDetail);
      }
    }
    return [...gameDetailList.entries()];
  }

  // private processLine(line: string, gameDetail: GameDetailResults) {

  // }
}
