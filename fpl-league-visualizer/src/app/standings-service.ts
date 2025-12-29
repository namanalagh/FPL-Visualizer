import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GwPicksDto, StandingsDto } from './standings/standingsDTO';
import { Squad, SquadPlayer, StandingsVM, Team } from './standings/standingsVM';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StandingsService {
  private baseUrl = '/fpl/api';

  constructor(private http: HttpClient) {}

  getLeagueStandings(leagueId: number){

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.get<StandingsDto>(`https://localhost:7043/api/standings/${leagueId}`).pipe(map(
      dto => this.mapToStandingsVM(dto)
    ));
  }

  getTeamPicks(playerId: number, gw: number) {
    return this.http
      .get<GwPicksDto>(`https://localhost:7043/api/entry/${playerId}/event/${gw}/picks/`)
      .pipe(
        tap(res => console.log('GW PICKS RAW', playerId, gw, res)),
        map(dto => this.mapToSquad(dto, gw)),
        tap(squad => console.log('MAPPED SQUAD', squad)),
        catchError(() => {
          const squad = new Squad();
          squad.gw = gw; // set the current gameweek
          squad.value = 1000;
          return of(squad);
        })
      );
  }

  private mapToSquad(dto: GwPicksDto, gw: number) {
   const squad = new Squad();

    squad.gw = gw;
    squad.points = dto.entry_history.points ?? 0;
    squad.total_points = dto.entry_history.total_points ?? 0;
    squad.rank = dto.entry_history.rank ?? 0;
    squad.bank = dto.entry_history.bank ?? 0;
    squad.value = dto.entry_history.value ?? 1000;
    squad.points_on_bench = dto.entry_history.points_on_bench ?? 0;

    squad.squad_players = dto.picks.map(p => ({
      element: p.element,
      position: p.position,
      multiplier: p.multiplier,
      is_captain: p.is_captain,
      is_vice_captain: p.is_vice_captain,
      element_type: p.element_type
    }));

    return squad;
  }

  private mapToStandingsVM(dto: StandingsDto): StandingsVM {
    const vm = new StandingsVM();

    vm.leagueId = dto.league.id;
    vm.leagueName = dto.league.name;

    const leaderPoints = dto.standings.results[0]?.total ?? 0;

    vm.teams = dto.standings.results.map(entry => {
      const team = new Team();
      team.id = entry.entry;
      team.rank = entry.rank;
      team.entry_name = entry.entry_name;
      team.player_name = entry.player_name;
      team.event_total = entry.event_total;
      team.total = entry.total;
      team.points_behind_leader = leaderPoints - entry.total;
      return team;
    });

    return vm
  }

  getLeagueStandingsWithPicks(leagueId: number) {
  return this.getLeagueStandings(leagueId).pipe(
      switchMap(vm => this.attachTeamPicks(vm, 18))
    );
  }

  private attachTeamPicks(vm: StandingsVM, maxGw: number) {
    const teamRequests = vm.teams.map(team => {

      const gwRequests = Array.from(
        { length: maxGw },
        (_, i) => i + 1
      ).map(gw =>
        this.getTeamPicks(team.id, gw).pipe(
          map(picks => {
            team.squad_by_gw[gw] = picks; // 1-indexed ✅
            return true;
          })
        )
      );

      return forkJoin(gwRequests);
    });

    return forkJoin(teamRequests).pipe(
      map(() => vm)
    );
  }
  }
