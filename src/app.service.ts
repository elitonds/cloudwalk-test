import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as readline from 'readline';
import { GameDetailResults } from './dtos/game-detail-results.dto';
import { MeansOfDeath } from './enums/means-of-death.enum';

@Injectable()
export class AppService {
  async processData() {
    const file = createReadStream(join(process.cwd(), 'qgames.log'));

    const logLines = readline.createInterface({
      input: file,
      crlfDelay: Infinity,
    });

    const gameDetailList = new Map<string, GameDetailResults>();
    const weaponDetailList = new Map<string, any>();

    const playerDetail = new Map<string, Map<string, number>>();
    let gameNumber = 0;
    let currentGameName = '';

    for await (const line of logLines) {
      if (line.includes('InitGame')) {
        const currentGame = gameDetailList.get(currentGameName);
        const currentPlayerDetail = playerDetail.get(currentGameName);
        const currentWeaponDetail = weaponDetailList.get(currentGameName);

        if (gameDetailList.size && currentGame.totalKills) {
          currentGame.kills = Object.fromEntries(
            [...currentPlayerDetail.entries()].sort((a, b) => b[1] - a[1]),
          );
          currentGame.players = [...currentPlayerDetail.keys()];
        }
        if (currentWeaponDetail) {
          weaponDetailList.set(currentGameName, {
            meansOfDeath: Object.fromEntries(
              [...currentWeaponDetail.entries()].sort((a, b) => b[1] - a[1]),
            ),
          });
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
        weaponDetailList.set(currentGameName, new Map());
      } else {
        this.processLine(
          line,
          gameDetailList.get(currentGameName),
          playerDetail.get(currentGameName),
          weaponDetailList.get(currentGameName),
        );
      }
    }
    return {
      gameInfo: Object.fromEntries(gameDetailList),
      totalByWeapon: Object.fromEntries(weaponDetailList),
    };
  }

  private processLine(
    line: string,
    gameDetail: GameDetailResults,
    playerDetail: Map<string, number>,
    weaponDetail: Map<MeansOfDeath, number>,
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
            this.setPlayerDetail(killerPlayer, playerDetail, true);
          }

          if (killedPlayerData.includes(' by ')) {
            const detailsBy = killedPlayerData.split(' by ') || [];
            if (detailsBy.length) {
              killedPlayer = detailsBy[0];
              weaponInfo = detailsBy[1].trim();
              this.setPlayerDetail(
                killedPlayer,
                playerDetail,
                false,
                killedByWorld,
              );
              this.setWeaponDetail(weaponInfo, weaponDetail);
            }
          }
        }
      }
    }
  }

  private setPlayerDetail(
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

  private setWeaponDetail(
    weapon: string,
    weaponDetail: Map<MeansOfDeath, number>,
  ) {
    let weaponKey = {} as MeansOfDeath;
    if (
      [
        'MOD_NAIL',
        'MOD_CHAINGUN',
        'MOD_PROXIMITY_MINE',
        'MOD_KAMIKAZE',
        'MOD_JUICED',
      ].includes(weapon)
    ) {
      weaponKey = MeansOfDeath.MOD_GRAPPLE;
    } else {
      weaponKey = MeansOfDeath[weapon];
    }
    const totalByWeapon = weaponDetail.get(weaponKey);

    if (totalByWeapon) {
      weaponDetail.set(weaponKey, totalByWeapon + 1);
    } else {
      weaponDetail.set(weaponKey, 1);
    }
  }
}
