import {
  Component,
  Input,
} from '@angular/core';
import { PlayerContribution, PlayerOwnership, PlayerStatContribution, StandingsVM } from '../../standings/standingsVM';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player-stats-table',
  imports: [CommonModule, FormsModule],
  templateUrl: './player-stats-table.html',
  styleUrl: './player-stats-table.css',
})
export class PlayerStatsTable {
  @Input() 
  standings!: StandingsVM

  selectedStat: PlayerStatOption = 'ownership';
  selectedStatLabel = 'Ownership %'


  getStatValue(): PlayerStatContribution[]{
    switch (this.selectedStat) {
      case 'ownership':
        this.selectedStatLabel = 'Ownership %'
        return this.standings.top10Owned
      case 'points':
        this.selectedStatLabel = 'Points Scored'
        return this.standings.topPointScorers
      case 'returns':
        this.selectedStatLabel = 'Points/GW*'
        return this.standings.topPointsPerGw
      case 'goals':
        this.selectedStatLabel = 'Goals Scored'
        return this.standings.topGoalScorers
      case 'assists':
        this.selectedStatLabel = 'Assists'
        return this.standings.topAssistProviders
      case 'defcons':
        this.selectedStatLabel = 'Defcons'
        return this.standings.topDefcons
      case 'cleanSheets':
        this.selectedStatLabel = 'Clean Sheets'   
        return this.standings.topCleanSheets
      case 'saves':
        this.selectedStatLabel = 'Saves'
        return this.standings.topSaves
    }
  }
}

export type PlayerStatOption = 
  | 'ownership' 
  | 'points' 
  | 'returns' 
  | 'goals' 
  | 'assists' 
  | 'defcons'
  | 'cleanSheets'
  | 'saves'
  ;