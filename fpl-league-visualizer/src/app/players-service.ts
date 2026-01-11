import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PlayerDTO, PlayerGwDto, PlayersCumulativeDto, StaticDataDto } from './StaticDataDTO';
import { finalize, map, Observable, of, shareReplay, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlayersService {
  private playerInfoCache = new Map<number, PlayersCumulativeDto>();
  private playerGwCache = new Map<number, Map<number, PlayerGwDto>>();
  private inFlightRequests = new Map<number, Observable<PlayerGwDto[]>>();
  private staticData!: StaticDataDto;

  constructor(private http: HttpClient) {}
  
  getStaticData(){
    return this.http.get<StaticDataDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/bootstrap-static`)
      .pipe(
        tap(data => {
          this.setStaticData(data);
        })
      );
  }
  
  getPlayerData(id: number){
    return this.http.get<PlayerDTO>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/element-summary/${id}`)
  }

  setStaticData(data: StaticDataDto) {
    this.staticData = data;

    data.elements.forEach(player => {
      this.playerInfoCache.set(player.id, player);
    })
  }

  buildPlayerGwCache(playerId: number, gwStats: PlayerGwDto[]){
    const gwMap = new Map<number, PlayerGwDto>

    for (const gw of gwStats){
      gwMap.set(gw.round, gw);
    }

    this.playerGwCache.set(playerId, gwMap);
  }

  ensurePlayerGwData(playerId: number): Observable<void> {

    if (this.playerGwCache.has(playerId)) {
      return of(void 0);
    }

    const inFlight = this.inFlightRequests.get(playerId);
    if (inFlight) {
      return inFlight.pipe(map(() => void 0));
    }

    const request$ = this.getPlayerData(playerId).pipe(
      map(dto => dto.history),  
      tap(stats => this.buildPlayerGwCache(playerId, stats)),
      finalize(() => this.inFlightRequests.delete(playerId)),
      shareReplay(1)
    );

    this.inFlightRequests.set(playerId, request$);

    return request$.pipe(map(() => void 0));
  }

  getPlayerGwStats(playerId: number, gw: number) : PlayerGwDto | undefined {
    return this.playerGwCache.get(playerId)?.get(gw);
  }

  getPlayerInfo(playerId: number) : PlayersCumulativeDto | undefined {
    return this.playerInfoCache.get(playerId);
  }
}

  