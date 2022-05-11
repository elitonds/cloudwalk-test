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
    const playerDetail = new Map<string, Map<string, number>>();
    let gameNumber = 0;
    let currentGame = '';

    for await (const line of rl) {
      if (line.includes('InitGame')) {
        if (gameDetailList.size && gameDetailList.get(currentGame).totalKills) {
          gameDetailList.get(currentGame).kills = [
            ...playerDetail.get(currentGame).entries(),
          ];
        }
        gameNumber++;
        currentGame = `game_${gameNumber}`;
        const gameDetail: GameDetailResults = {
          kills: [],
          players: [],
          totalKills: 0,
        };
        gameDetailList.set(currentGame, gameDetail);
        playerDetail.set(currentGame, new Map());
      } else {
        this.processLine(
          line,
          gameDetailList.get(currentGame),
          playerDetail.get(currentGame),
        );
      }
    }
    return [...gameDetailList.entries()];
  }

  private processLine(
    line: string,
    gameDetail: GameDetailResults,
    playerDetail: Map<string, number>,
  ) {
    if (line.includes('Kill:')) {
      gameDetail.totalKills++;
      const slicesLine = line.split(':');
      const killInfo = slicesLine.find((a) => a.includes(' killed '));
      if (killInfo) {
        const detailsKill = killInfo.split(' killed ') || [];
        detailsKill.forEach((detail) => {
          const cleanDetail = detail.trim();
          if (cleanDetail !== '<world>') {
            if (cleanDetail.includes(' by ')) {
              const detailsBy = cleanDetail.split(' by ') || [];
              if (detailsBy.length) this.setPlayer(detailsBy[0], playerDetail);
            } else this.setPlayer(cleanDetail, playerDetail);
          }
        });
      }
    }
  }

  private setPlayer(playerName: string, kills: Map<string, number>) {
    if (!kills.get(playerName)) kills.set(playerName, 0);
  }
}
