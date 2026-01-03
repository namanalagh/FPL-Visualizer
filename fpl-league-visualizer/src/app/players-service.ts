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

  buildFullCache(data: Record<number, PlayerGwDto[]>){
    Object.entries(data).forEach(([playerId, stats]) => {
      const gwMap = new Map<number, PlayerGwDto>();
      stats.forEach(s => gwMap.set(s.round, s));
      this.playerGwCache.set(+playerId, gwMap);
    });
  }

  getPlayerGwStat(playerId: number, gw: number) : PlayerGwDto | undefined {
    return this.playerGwCache.get(playerId)?.get(gw);
  }
}

export type PlayerGwCache =
  Map<number, Map<number, PlayerGwDto>>;