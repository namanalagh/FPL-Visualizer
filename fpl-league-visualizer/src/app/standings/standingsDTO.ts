export interface StandingsDto {
  league: LeagueDTO
  standings: {
    results: StandingEntryDto[];
  };
}

export interface LeagueDTO {
  id: number
  name: string
}

export interface StandingEntryDto {
  entry: number;
  rank: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total: number;
}

export interface EntryDto {
  id: number;
  started_event: number;
}

export interface GwPicksDto {
  entry_history: EntryHistoryDTO;
  picks: PicksDto[];
}

export interface EntryHistoryDTO {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  bank: number;
  value: number;
  points_on_bench: number;
}

export interface PicksDto {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}