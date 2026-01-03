import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PlayerGwDto, PlayersCumulativeDto, StaticDataDto } from './StaticDataDTO';

@Injectable({
  providedIn: 'root',
})
export class PlayersService {
  private playerGwCache!: PlayerGwCache;
  private staticData!: StaticDataDto;

  constructor(private http: HttpClient) {}
  
  getStaticData(){
    return this.http.get<StaticDataDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/bootstrap-static`);
  }
  
  getPlayerData(id: number){
    return this.http.get<PlayersCumulativeDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/element-summary/${id}`)
  }

  setStaticData(data: StaticDataDto) {
    this.staticData = data;
  }

  buildPlayerGwCache(playerId: number, gwStats: PlayerGwDto[]){
    const gwMap = new Map<number, PlayerGwDto>

    for (const gw of gwStats){
      gwMap.set(gw.round, gw);
    }

    this.playerGwCache.set(playerId, gwMap);
  }

  buildFullCache(data: Record<number, PlayerGwDto[]>) {
    console.log('[PlayerGwCache] Building full cache...');
    console.log('[PlayerGwCache] Incoming players:', Object.keys(data).length);

    Object.entries(data).forEach(([playerId, stats]) => {
      console.log(
        `[PlayerGwCache] Building cache for player ${playerId}, GW count: ${stats.length}`
      );

      const gwMap = new Map<number, PlayerGwDto>();

      stats.forEach(s => {
        console.log(
          `[PlayerGwCache] → player ${playerId}, GW ${s.round}`,
          s
        );
        gwMap.set(s.round, s);
      });

      this.playerGwCache.set(+playerId, gwMap);
    });

    console.log(
      '[PlayerGwCache] Cache build complete. Players cached:',
      this.playerGwCache.size
    );
  }

  getPlayerGwStats(playerId: number, gw: number): PlayerGwDto | undefined {
    const playerCache = this.playerGwCache.get(playerId);

    if (!playerCache) {
      console.warn(
        `[PlayerGwCache] MISS: No cache found for player ${playerId}`
      );
      return undefined;
    }

    const gwStat = playerCache.get(gw);

    if (!gwStat) {
      console.warn(
        `[PlayerGwCache] MISS: Player ${playerId} has no data for GW ${gw}`
      );
      return undefined;
    }

    console.log(
      `[PlayerGwCache] HIT: Player ${playerId}, GW ${gw}`,
      gwStat
    );

    return gwStat;
  }


  // buildFullCache(data: Record<number, PlayerGwDto[]>){
  //   Object.entries(data).forEach(([playerId, stats]) => {
  //     const gwMap = new Map<number, PlayerGwDto>();
  //     stats.forEach(s => gwMap.set(s.round, s));
  //     this.playerGwCache.set(+playerId, gwMap);
  //   });
  // }

  // getPlayerGwStats(playerId: number, gw: number) : PlayerGwDto | undefined {
  //   console.log(this.playerGwCache.get(playerId)?.get(gw))
  //   return this.playerGwCache.get(playerId)?.get(gw);
  // }
}

export type PlayerGwCache =
  Map<number, Map<number, PlayerGwDto>>;