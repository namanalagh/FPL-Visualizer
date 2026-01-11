export interface StaticDataDto{
    events: EventsDto[];
    elements: PlayersCumulativeDto[];
}

export interface EventsDto{
    id: number
    name: string
    average_entry_score: number
    highest_score: number
    is_current: boolean
}

export interface PlayersCumulativeDto{
    id: number
    event_points: number
    first_name: string
    second_name: string
    team: number;
    points_per_game: string
    total_points: number
    value_form: number
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

export interface PlayerDTO {
    history: PlayerGwDto[];
}

export interface PlayerGwDto { // use this to make a cache 
    element: number;
    round: number; // gw
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
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
}
