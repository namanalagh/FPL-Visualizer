export class StandingsVM{
    leagueId = 0;
    leagueName = '';
    teams: Team[] = [];
}

export class Team{
    id: number = 0;
    rank: number = 0;
    entry_name: string = "";
    player_name: string = "";
    event_total: number = 0;
    total: number = 0;
    squad_by_gw: Squad[] = [];
    points_behind_leader = 0;
    /**
     *
     */
    constructor() {
        this.squad_by_gw = Array.from({length: 39}, (_,i) => {
            const squad = new Squad();
            squad.gw = i;
            return squad;
        }
        )
        
    }
}

export class Squad{
    gw: number = 0;
    points: number = 0;
    total_points: number = 0;
    squad_players: SquadPlayer[] = [];
    rank: number = 0;
    bank: number = 0;
    value: number = 100;
    points_on_bench: number = 0;
    goals_scored: number = 0;
    assists: number = 0
    clean_sheets: number = 0
    goals_conceded: number = 0
    saves: number = 0
}

export class SquadPlayer{
    element: number = 0;    // playerID
    position: number = 0;   // 12-15 is bench
    multiplier: number = 1; 
    is_vice_captain: boolean = false;
    is_captain: boolean = false;
    element_type: number = 0; // player type: gk, def etc
}