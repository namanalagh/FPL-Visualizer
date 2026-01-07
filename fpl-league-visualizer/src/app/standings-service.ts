import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EntryDto, GwPicksDto, StandingsDto } from './standings/standingsDTO';
import { Squad, SquadPlayer, StandingsVM, Team } from './standings/standingsVM';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { PlayersService } from './players-service';

@Injectable({
  providedIn: 'root',
})
export class StandingsService {
  private baseUrl = '/fpl/api';

  constructor(private http: HttpClient, private playersService: PlayersService) {}

  getLeagueStandings(leagueId: number){

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.get<StandingsDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/standings/${leagueId}`).pipe(map(
      dto => this.mapToStandingsVM(dto)
    ));
  }

  getLeagueEntry(userId: number){
    // return this.http.get<EntryDto>(`https://localhost:7043/api/entry/${userId}`)
    return this.http.get<EntryDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/entry/${userId}`)
      .pipe()
  }

  getTeamPicks(userId: number, gw: number) {
    return this.http
      .get<GwPicksDto>(`https://fplstatsvisualizer-api-fydncme4baa9gkev.southindia-01.azurewebsites.net/api/entry/${userId}/event/${gw}/picks/`)
      .pipe(
       // tap(res => console.log('GW PICKS RAW', userId, gw, res)),
        map(dto => this.mapToSquad(dto, gw)),
        // tap(squad => console.log('MAPPED SQUAD', squad)),
        catchError(() => {
          const squad = new Squad();
          squad.gw = gw; // set the current gameweek
          squad.value = 1000;
          return of(squad);
        })
      );
  }

  private loadEntries(teams: Team[]){
    const requests = teams.map(team =>
      this.getLeagueEntry(team.id).pipe(
        map((res: EntryDto) => ({
          id: res.id,
          started_event: res.started_event ?? 1
        })),
        catchError(()=> of({
          id: team.id,
          started_event: 1
        }))
      )
    )

    return forkJoin(requests);
  }

  private applyEntries(teams: Team[], entries: EntryDto[]){
    const map = new Map(
      entries.map(e=> [e.id, e.started_event])
    )

    teams.forEach(team => {
      const started = map.get(team.id);
      if (started !== undefined) {
        team.started_event = started;
      }
    });
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
    this.populateSquadStats(squad);

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

  private populateSquadStats(squad: Squad) {
    squad.goals_scored = 0;
    squad.assists = 0;
    squad.clean_sheets = 0;
    squad.goals_conceded = 0;
    squad.saves = 0;

    for (const sp of squad.squad_players) {
      const stats = this.playersService.getPlayerGwStats(sp.element, squad.gw);
      if (!stats) continue;

      const multiplier = sp.multiplier ?? 1;

      squad.goals_scored += stats.goals_scored * multiplier;
      squad.assists += stats.assists * multiplier;
      squad.clean_sheets += stats.clean_sheets * multiplier;
      squad.goals_conceded += stats.goals_conceded * multiplier;
      squad.saves += stats.saves * multiplier;
    }
  }

  private ensurePlayersForSquad(players: SquadPlayer[]) {
    const uniquePlayerIds = Array.from(
      new Set(players.map(p => p.element))
    );

    if (uniquePlayerIds.length === 0) {
      return of(true);
    }

    const requests = uniquePlayerIds.map(id =>
      this.playersService.ensurePlayerGwData(id)
    );

    return forkJoin(requests).pipe(map(() => true));
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

  getLeagueStandingsWithPicks(leagueId: number, gw: number) {
  return this.getLeagueStandings(leagueId).pipe(
     map(vm => {
        vm.teams = vm.teams.slice(0, 25);
        return vm;
      }),
      switchMap(vm => this.loadEntries(vm.teams).pipe(
        tap(entries => this.applyEntries(vm.teams, entries)),
        map(() => vm)
      )),
      switchMap(vm => this.attachTeamPicks(vm, gw).pipe(
        map(() =>  {
          this.calculateLeagueRanks(vm, gw);
          return vm;
        })
      ))
    );
  }

  private attachTeamPicks(vm: StandingsVM, maxGw: number) {
    const teamRequests = vm.teams.map(team => {

      const gwRequests = Array.from({ length: maxGw }, (_, i) => i + 1).map(gw =>
        this.getTeamPicks(team.id, gw).pipe(

          switchMap(squad =>
            this.ensurePlayersForSquad(squad.squad_players).pipe(
              map(() => squad)
            )
          ),

          tap(squad => {
            this.populateSquadStats(squad);
            team.squad_by_gw[gw] = squad; // 1-indexed
          }),

          map(() => true)
        )
      );

      return forkJoin(gwRequests);
    });

    return forkJoin(teamRequests).pipe(map(() => vm));
  }


  private calculateLeagueRanks(vm: StandingsVM, gw: number) {
      const maxGw = gw;

      for (let gw = 1; gw <= maxGw; gw++) {
          // collect scores for this GW
          const scores = vm.teams.map(team => ({
            team,
            total: team.squad_by_gw[gw]?.total_points ?? 0
          }));

          // sort descending
          scores.sort((a, b) => b.total - a.total);

          // assign ranks (handles ties)
          let rank = 1;
          let prevTotal: number | null = null;

          scores.forEach((item, index) => {
            if (prevTotal !== null && item.total < prevTotal) {
                rank = index + 1;
            }

            item.team.squad_by_gw[gw].rank = rank;
            prevTotal = item.total;
          });
      }
  }
}
