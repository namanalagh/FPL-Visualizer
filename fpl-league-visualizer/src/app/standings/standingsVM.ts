import { PlayerGwDto, PlayersCumulativeDto } from "../StaticDataDTO";
import { ChipType } from "./standingsDTO";

export class StandingsVM{
    leagueId = 0;
    leagueName = '';
    teams: Team[] = [];
    currentGw: number = 1;
    top10Owned: PlayerOwnership[] = [];
    playerContributions: PlayerContribution[] = [];
    topPointScorers: PlayerContribution[] = [];
    topGoalScorers: PlayerContribution[] = [];
    topAssistProviders: PlayerContribution[] = [];
    topCleanSheets: PlayerContribution[] = [];
    topDefcons: PlayerContribution[] = [];
    topSaves: PlayerContribution[] = [];
    topStarts: PlayerContribution[] = [];
    topPointsPerGw: PlayerContribution[] = [];

    get allSquads(): Squad[] {
        return this.teams.flatMap(t => t.squad_by_gw);
    }

    get allPickedPlayers(): SquadPlayer[] {
        return this.allSquads.flatMap(s => s.squad_players);
    }

    get allStartingPlayers(): SquadPlayer[] {
        return this.allPickedPlayers.filter(p => p.multiplier > 0);
    }

    get ownershipMap(): Map<number, number> {
        const map = new Map<number, number>();

        for (const p of this.allPickedPlayers) {
            map.set(p.element, (map.get(p.element) ?? 0) + 1);
        }

        return map;
    }

    get totalPicks(): number {
        return this.allPickedPlayers.length;
    }

    getTop10Owned(getPlayerDetails: (id: number) => PlayersCumulativeDto | undefined) {
        const latestSquads = this.teams.map(t =>
            t.squad_by_gw[this.currentGw]);

        const counts = new Map<number, number>();

        for (const squad of latestSquads) {
            for (const p of squad.squad_players) {
                counts.set(p.element, (counts.get(p.element) ?? 0) + 1);
            }
        }

        this.top10Owned = Array.from(counts.entries())
            .map(([element, count]) => ({
                element,
                count,
                percent: (count / (this.teams.length)) * 100 ,
                player_details: getPlayerDetails(element)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    getPlayerContributions(
        fromGw: number = 0,
        toGw: number = this.currentGw,
        getPlayerGwStats: (playerId: number, gw: number) => PlayerGwDto | undefined,
        getPlayerDetails: (playerId: number) => PlayersCumulativeDto | undefined
        ) {

        const map = new Map<string, PlayerContribution>();

        for (const team of this.teams) {
            for (let gw = fromGw; gw <= toGw; gw++) {
                const squad = team.squad_by_gw[gw];
                if (!squad) continue;

                for (const sp of squad.squad_players) {
                    if (sp.multiplier === 0) continue;   // benched

                    const gwStats = getPlayerGwStats(sp.element, gw);
                    if (!gwStats) continue;

                    const player = getPlayerDetails(sp.element);

                    const key = `${team.id}_${sp.element}`;

                    let entry = map.get(key);
                    if (!entry) {
                        entry = {
                            element: sp.element,
                            element_type: 0,
                            fplTeamId: team.id,
                            fplTeamName: team.entry_name,
                            web_name: player?.web_name ?? 'Unknown',
                            total_points: 0,
                            points_per_game: 0,
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
                        };
                        map.set(key, entry);
                    }

                    const m = sp.multiplier;

                    entry.starts++;
                    entry.element_type = player?.element_type ?? 0;
                    entry.total_points += (gwStats as any).total_points * m; 
                    entry.goals_scored += gwStats.goals_scored * m;
                    entry.assists += gwStats.assists * m;
                    entry.clean_sheets += gwStats.clean_sheets * m;
                    entry.goals_conceded += gwStats.goals_conceded * m;
                    entry.own_goals += gwStats.own_goals * m;
                    entry.penalties_saved += gwStats.penalties_saved * m;
                    entry.penalties_missed += gwStats.penalties_missed * m;
                    entry.yellow_cards += gwStats.yellow_cards;
                    entry.red_cards += gwStats.red_cards;
                    entry.saves += gwStats.saves * m;
                    entry.bonus += gwStats.bonus * m;
                    entry.clearances_blocks_interceptions += gwStats.clearances_blocks_interceptions * m;
                    entry.recoveries += gwStats.recoveries * m;
                    entry.tackles += gwStats.tackles * m;
                    entry.defensive_contribution += gwStats.defensive_contribution * m;
                }
            }
        }

        for (const e of map.values()) {
            e.points_per_game = (e.total_points / Math.max(1, e.starts));
        }

        const all = Array.from(map.values());
        this.playerContributions = all;

        this.topPointScorers = [...all]
        .sort((a,b) => b.total_points - a.total_points)
        .slice(0,10);

        this.topGoalScorers = [...all]
        .sort((a,b) => b.goals_scored - a.goals_scored)
        .slice(0,10);

        this.topAssistProviders = [...all]
        .sort((a,b) => b.assists - a.assists)
        .slice(0,10); 

        this.topDefcons = [...all]
        .sort((a,b) => b.defensive_contribution - a.defensive_contribution)
        .slice(0,10); 

        this.topCleanSheets = [...all]
        .filter(a => a.element_type < 3)
        .sort((a,b) => b.clean_sheets - a.clean_sheets)
        .slice(0,10); 

        this.topSaves = [...all]
        .sort((a,b) => b.saves - a.saves)
        .slice(0,10);
        
        this.topStarts = [...all]
        .sort((a,b) => b.starts - a.starts)
        .slice(0,10);

        this.topPointsPerGw = [...all]
        .sort((a,b) => b.points_per_game - a.points_per_game)
        .filter(a => a.starts > 9)
        .slice(0,10);

        // console.table(
        //     this.topDefenders.slice(0, 20).map(p => ({
        //         name: p.web_name,
        //         pts: p.total_points,
        //         goals: p.goals_scored,
        //         assists: p.assists,
        //         def: p.defensive_contribution
        //     }))
        // );
    }
}

export class Team{
    id: number = 0;
    rank: number = 0;
    entry_name: string = "";
    player_name: string = "";
    started_event: number = 1;
    event_total: number = 0;
    total: number = 0;
    squad_by_gw: Squad[] = [];
    points_behind_leader = 0;

    constructor() {
        this.squad_by_gw = Array.from({length: 39}, (_,i) => {
            const squad = new Squad();
            squad.gw = i;
            return squad;
        })
    }
}

export class Squad{
    gw: number = 0;
    points: number = 0;
    total_points: number = 0;
    squad_players: SquadPlayer[] = [];
    rank: number = 0;
    weekly_rank: number = 0;
    active_chip: ChipType = null;
    bank: number = 0;
    value: number = 1000;
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

export interface PlayerOwnership {
    element: number;
    count: number;
    percent: number;
    player_details?: PlayersCumulativeDto
} 

export interface PlayerContribution { // stats for a player based on their contributions to a particular fpl team
    element: number
    element_type: number
    fplTeamId: number
    fplTeamName: string
    points_per_game: number
    total_points: number
    web_name: string
    goals_scored: number
    assists: number
    clean_sheets: number
    goals_conceded: number
    own_goals: number
    penalties_saved: number
    penalties_missed: number
    yellow_cards: number
    red_cards: number
    saves: number
    bonus: number
    clearances_blocks_interceptions: number
    recoveries: number
    tackles: number
    defensive_contribution: number
    starts: number
}