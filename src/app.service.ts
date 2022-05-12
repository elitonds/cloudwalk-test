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
    let currentGameName = '';

    for await (const line of rl) {
      if (line.includes('InitGame')) {
        const currentGame = gameDetailList.get(currentGameName);
        const currentPlayerDetail = playerDetail.get(currentGameName);
        if (gameDetailList.size && currentGame.totalKills) {
          currentGame.kills = [...currentPlayerDetail.entries()];
          currentGame.players = [...currentPlayerDetail.keys()];
        }
        gameNumber++;
        currentGameName = `game_${gameNumber}`;
        const gameDetail: GameDetailResults = {
          kills: [],
          players: [],
          totalKills: 0,
        };
        gameDetailList.set(currentGameName, gameDetail);
        playerDetail.set(currentGameName, new Map());
      } else {
        this.processLine(
          line,
          gameDetailList.get(currentGameName),
          playerDetail.get(currentGameName),
        );
      }
    }
    return { gameInfo: [...gameDetailList.entries()] };
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

        if (detailsKill.length) {
          const killerPlayer = detailsKill[0].trim();
          const killedPlayerData = detailsKill[1].trim();
          let killedPlayer = '';
          let weaponInfo = '';
          let killedByWorld = false;

          if (killerPlayer === '<world>') {
            killedByWorld = true;
          } else {
            this.setPlayer(killerPlayer, playerDetail, true);
          }

          if (killedPlayerData.includes(' by ')) {
            const detailsBy = killedPlayerData.split(' by ') || [];
            if (detailsBy.length) {
              killedPlayer = detailsBy[0];
              weaponInfo = detailsBy[1].trim();
              this.setPlayer(killedPlayer, playerDetail, false, killedByWorld);
            }
          }
        }
      }
    }
  }

  private setPlayer(
    playerName: string,
    kills: Map<string, number>,
    isKiller = false,
    killedByWorld = false,
  ) {
    const playerkills = kills.get(playerName);
    if (playerkills === undefined) kills.set(playerName, isKiller ? 1 : 0);
    else {
      if (isKiller) {
        kills.set(playerName, playerkills + 1);
      } else {
        if (killedByWorld) {
          kills.set(playerName, playerkills - 1);
        }
      }
    }
  }
}
