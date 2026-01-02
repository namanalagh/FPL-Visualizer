import { Component, ElementRef, ViewChild } from '@angular/core';
import { StandingsService } from '../standings-service';
import { StandingEntryDto, StandingsDto } from './standingsDTO';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Squad, StandingsVM, Team } from './standingsVM';
import { Chart } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { PlayersService } from '../players-service';
import { EventsDto, StaticDataDto } from '../StaticDataDTO';

@Component({
  selector: 'app-standings',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './standings.html',
  styleUrl: './standings.css',
})
export class Standings {
  standings!: StandingsVM;
  results: Team[] = [];
  selectedStat: 'gwPoints' | 'totalPoints' | 'squadValue' | 'pointsOnBench' | 'rank' = 'totalPoints';
  showStatPopup = false;
  staticData!: StaticDataDto
  @ViewChild('leagueChart') leagueChart!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  totalPts: number = 0;
  totalValue: number = 0;
  gwAvg: number = 0;
  leagueIdInput: number | null = null;
  loading = false;
  error = '';
  currentGw!: EventsDto;
  _chartStartGw = 1;
  _chartEndGw = this.currentGw?.id ?? 38

  get chartStartGw(): number{
    return this._chartStartGw;
  }
  set chartStartGw(value: number){
    value = Math.floor(Number(value));

    if (isNaN(value)) return;

    // clamp
    value = Math.max(1, value);
    value = Math.min(value, this._chartEndGw-1);

    this._chartStartGw = value;
  }

  get chartEndGw(): number{
    return this._chartEndGw;
  }
  set chartEndGw(value: number) {
    value = Math.floor(Number(value));

    if (isNaN(value)) return;

    // clamp
    value = Math.min(this.currentGw.id, value);
    value = Math.max(value, this._chartStartGw+1);

    this._chartEndGw = value;
  }

  onStartGwChange(value: number) {
    this.chartStartGw = value;
  }

  onEndGwChange(value: number) {
    this.chartEndGw = value;
  }

  get avgPts(): number {
    return this.totalPts/this.results.length
  }
  get avgVal(): number{
    return this.totalValue/this.results.length/10
  }

  constructor(private standingsService: StandingsService, private playersService: PlayersService, private cdr: ChangeDetectorRef) {}
  
  renderChart(fromGw: number = 1, uptoGw: number = 38) {
    if (!this.leagueChart) return;
    const top10Teams = this.standings.teams.slice(0, 10);

    const labels = Array.from(
      { length: uptoGw - fromGw + 1 },
      (_, i) => `GW ${i + fromGw}`
    );

    const datasets = top10Teams.map(team => ({
      label: team.entry_name,
      data: team.squad_by_gw
        .slice(fromGw, uptoGw + 1)
        .map(s => this.getStatValue(s)),
      tension: 0.25,
      pointRadius: 0
    }));

    console.log(datasets)

    this.chart?.destroy();

    this.chart = new Chart(this.leagueChart.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
           x: {
            type: 'category',
            grid: {
              display: false,
              color: 'rgba(255, 255, 255, 0.2)',
            }
          },
          y: {
            type: 'linear',
            reverse: this.selectedStat == 'rank' ? true : false,
            ticks: {
              // callback: (value) => Number.isInteger(value) ? value : ''
              precision: 0  
            },
            grid: {
              display: true,
              color: 'rgba(255, 255, 255, 0.2)',
            }
          }
        }
      }
    });
  }
  
  calculateStats(){  
    this.resetStats();
    this.results.forEach(res => {
      //this.getPicks(res.id);
      this.totalPts += res.total;
      this.totalValue += res.squad_by_gw[this.currentGw.id].value;
      this.gwAvg += res.event_total;
    });
    
    this.gwAvg /= this.results.length;
    this.renderChart(this.chartStartGw, this.chartEndGw);
  }

  private getStatValue(squad: Squad): number {
    switch (this.selectedStat) {
      case 'gwPoints':
        return squad.points;
      case 'totalPoints':
        return squad.total_points;
      case 'squadValue':
        return squad.value/10;
      case 'pointsOnBench':
        return squad.points_on_bench;
      case 'rank':
        return squad.rank;
      default:
        return 0;
    }
  }

  resetStats(){
    this.totalPts = 0;
    this.totalValue = 0;
    this.gwAvg = 0;
  }

  loadLeague(){
    if (!this.leagueIdInput || this.leagueIdInput <= 0) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.standingsService.getLeagueStandingsWithPicks(this.leagueIdInput, this.currentGw.id).subscribe(vm => {
      this.standings = vm;
      this.results = [...this.standings.teams];
      this.calculateStats();
      this.cdr.detectChanges();  
      console.log(vm);
    });

    
  }
  
  ngOnInit() {
    this.playersService.getStaticData().subscribe(data => {
      this.staticData = data
      this.currentGw = this.staticData.events.find(gw => gw.is_current)!
      this.chartEndGw = this.currentGw?.id ?? 38
    });
  }
}

  // OUR LEAGUE: 2246597