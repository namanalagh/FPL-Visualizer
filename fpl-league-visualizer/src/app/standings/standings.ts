import { Component, ElementRef, ViewChild } from '@angular/core';
import { StandingsService } from '../standings-service';
import { StandingEntryDto, StandingsDto } from './standingsDTO';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Squad, StandingsVM, Team } from './standingsVM';
import { Chart } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';

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
  selectedStat: 'gwPoints' | 'totalPoints' | 'squadValue' | 'pointsOnBench' = 'totalPoints';
  showStatPopup = false;

  @ViewChild('leagueChart') leagueChart!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;
  totalPts: number = 0;
  totalValue: number = 0;
  gwAvg: number = 0;

  get avgPts(): number {
    return this.totalPts/this.results.length
  }
  get avgVal(): number{
    return this.totalValue/this.results.length/10
  }

  constructor(private standingsService: StandingsService, private cdr: ChangeDetectorRef) {}
  
  renderChart(uptoGw: number = 38) {
    if (!this.leagueChart) return;
    const top10Teams = this.standings.teams.slice(0, 10);

    const labels = Array.from(
      { length: uptoGw },
      (_, i) => `GW ${i + 1}`
    );

    const datasets = top10Teams.map(team => ({
      label: team.entry_name,
      data: team.squad_by_gw
        .slice(1, uptoGw + 1)
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
    this.results.forEach(res => {
      //this.getPicks(res.id);
      this.totalPts += res.total;
      this.totalValue += res.squad_by_gw[18].value;
      this.gwAvg += res.event_total;
    });
    
    this.gwAvg /= this.results.length;
    this.renderChart(18);
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
    default:
      return 0;
  }
}
  
  ngOnInit() {
    this.standingsService.getLeagueStandingsWithPicks(2246597).subscribe(vm => {
      this.standings = vm;
      this.results = [...this.standings.teams];
      this.calculateStats();
      this.cdr.detectChanges();  
      console.log(vm);
    });
  }
}

export type StatType =
  | 'gwPoints'
  | 'totalPoints'
  | 'squadValue';
