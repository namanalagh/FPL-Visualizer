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

  public buildCumulativeFromGw(
    basePlayer: PlayersCumulativeDto,
    fromGw: number,
    toGw: number
  ) : PlayersCumulativeDto {
    const gwStats: PlayerGwDto[] = [];

    for(let gw = fromGw; gw <= toGw; gw++){
      const stat = this.getPlayerGwStats(basePlayer.id, gw);
      if(stat){
        gwStats.push(stat);
      }
    }

    const aggregated = gwStats.reduce(
      (acc, gw) => {
        acc.total_points += gw.total_points;
        acc.goals_scored += gw.goals_scored;
        acc.assists += gw.assists;
        acc.clean_sheets += gw.clean_sheets;
        acc.goals_conceded += gw.goals_conceded;
        acc.own_goals += gw.own_goals;
        acc.penalties_saved += gw.penalties_saved;
        acc.penalties_missed += gw.penalties_missed;
        acc.yellow_cards += gw.yellow_cards;
        acc.red_cards += gw.red_cards;
        acc.saves += gw.saves;
        acc.bonus += gw.bonus;
        acc.clearances_blocks_interceptions += gw.clearances_blocks_interceptions;
        acc.recoveries += gw.recoveries;
        acc.tackles += gw.tackles;
        acc.defensive_contribution += gw.defensive_contribution;
        acc.starts = gw.starts;

        return acc;
      },
      {
        ...basePlayer,
        event_points: 0,
        total_points: 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        own_goals: 0,
        penalties_saved: 0,
        penalties_missed: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        clearances_blocks_interceptions: 0,
        recoveries: 0,
        tackles: 0,
        defensive_contribution: 0,
        starts: 0
      } as PlayersCumulativeDto
    );

    
    aggregated.points_per_game = aggregated.starts > 0 ? (aggregated.total_points / aggregated.starts).toFixed(2) : '0.00';

    return aggregated;
  }
}

  

// Cumulative data for each player comes from the static data api
// Per Gw data needs a call per player