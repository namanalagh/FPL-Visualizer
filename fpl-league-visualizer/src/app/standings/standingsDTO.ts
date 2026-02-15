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
  rank: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_event_points: number;
  summary_overall_points: number;
}

export interface GwPicksDto {
  active_chip: ChipType
  entry_history: EntryHistoryDTO;
  picks: PicksDto[];
}

export interface EntryHistoryDTO {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  overall_rank: number;
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

export interface TransferDto {
  element_in: number;
  element_out: number;
  event: number;
  element_in_cost: number;
  element_out_cost: number;
}

export type ChipType =
| null
| 'bboost'
| '3xc'
| 'wildcard'
| 'freehit'