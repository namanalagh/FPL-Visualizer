import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  NgZone,
  input
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, ScriptableLineSegmentContext } from 'chart.js/auto';
import { PlayerContribution, Squad, Team } from '../../standings/standingsVM';
import { EventsDto } from '../../StaticDataDTO';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graph.html',
  styleUrl: './graph.css',
})
export class Graph {
  @ViewChild('leagueChart') leagueChart!: ElementRef<HTMLCanvasElement>;
  
  private _currentGw!: EventsDto;
  @Input() 
  set currentGw(value: EventsDto) {
    this._currentGw = value;
    this.tryRender();
  }
  get currentGw() { return this._currentGw; }
  
  private _teams!: Team[]
  @Input() set teams(value: Team[]) {
    this._teams = value;
    this.tryRender();
  }

  @Input() isLeague: boolean = true
  get teams() {return this._teams}
  
  chart!: Chart;
  projections = false
  _chartStartGw = 1;
  _chartEndGw!: number
  cumulative = false
  showCumulative = false
  _showProjectionsBox = false
  selectedStat: StatOption = 'totalPoints';
  selectedProjectionStat: ProjectionStatOption = 'teamForm';
  startGw = 1
  
  constructor(private zone: NgZone) {}

  ngOnInit(){
    console.log("ngOnChanges");
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentGw'] && this.currentGw && this.teams) {
      console.log("ngOnChanges");
      if(!this.isLeague) {this.startGw = this.teams[0].started_event}
      this.renderChart()
    }
  } 

  private tryRender() {
    if (!this._currentGw || !this._teams) return;

    if (this._chartEndGw == null) {
      this._chartEndGw = this.projections ? 38 : this._currentGw.id;
    }

    this.renderChart();
  }

  set showProjectionsBox(value: boolean) {
    this._showProjectionsBox = value;

    if (!value) {
      this.chartStartGw = Math.min(this.chartStartGw, this.currentGw.id-1);
      this.chartEndGw = this.currentGw.id;
      console.log("Set chartEndGw to", this._chartEndGw);
    }
    else{
      this.chartEndGw = 38;
    }
  }

  get showProjectionsBox(): boolean {
    return this._showProjectionsBox;
  }
  
  get chartStartGw(): number{
    return this._chartStartGw;
  }
  set chartStartGw(value: number){
    value = Math.floor(Number(value));

    if (isNaN(value)) return;

    value = Math.max(this.startGw, value);
    value = Math.min(value, this._chartEndGw-1);

    this._chartStartGw = value;
  }

  get chartEndGw(): number{
    return this._chartEndGw ?? (this.currentGw.id ?? 38);
  }
  set chartEndGw(value: number) {
    value = Math.floor(Number(value));

    if (isNaN(value)) return;

    value = Math.min((this.projections && this.showProjectionsBox ? 38 : this.currentGw.id), value);
    value = Math.max(value, this._chartStartGw+1);

    this._chartEndGw = value;
  }

  onProjectionsChange(checked: boolean) {
    const maxGw = checked && this.showProjectionsBox ? 38 : this.currentGw.id;
    this.chartStartGw = Math.min(this.chartStartGw, this.currentGw.id-1)
    this.chartEndGw = maxGw;
    this.renderChart(this.chartStartGw, this.chartEndGw);
  }

  renderChart(fromGw: number = this.chartStartGw, uptoGw: number = this.chartEndGw){
    if(this.selectedStat != 'pointsByClub' && this.selectedStat != 'pointsByPos'){
      this.renderLineChart(fromGw, uptoGw);
    }
    else {
      this.renderPieChart();
    }
  }

  renderLineChart(fromGw: number = this.chartStartGw, uptoGw: number = this.chartEndGw) {
    console.log("renderLineChart", this._chartEndGw);
    if(!this.showProjectionsBox) {
      uptoGw = Math.min(uptoGw, this.currentGw.id);
    }
    if (!this.leagueChart) return;
    const top10Teams = this.teams.slice(0, 10);
    const dashFromIndex = this.currentGw.id-fromGw; 

    const labels = Array.from(
      { length: uptoGw - fromGw + 1 },
      (_, i) => `GW ${i + fromGw}`
    );
  
    const datasets = top10Teams.map(team => {

      const values = team.squad_by_gw.slice(fromGw, uptoGw + 1).map(s => this.getStatValue(s))
      
      var data = this.showCumulative &&  this.cumulative ? values.reduce<number[]>((acc, val, i) => {
        acc.push((acc[i - 1] ?? 0) + val);
        return acc;
      }, []) : values;

      if(this.projections && this.showProjectionsBox && this.currentGw.id < 38){
        this.createProjection(team, data, fromGw);
      }

      return {
        label: team.entry_name,
        data: data,
        pointStyle: 'circle',
        tension: 0.25,
        pointRadius: window.innerWidth < 600 ? this.projections ? 1 : 2 : 3,
        borderWidth: window.innerWidth < 600 ? 2 : 3,
        segment: {
          borderDash: (ctx: ScriptableLineSegmentContext) => {    
            return ctx.p0DataIndex >= dashFromIndex
              ?  window.innerWidth < 600 ? [3,1] : [6, 6]   
              : undefined; 
          }
        }
      }
    });

    // console.log(datasets)

    this.zone.runOutsideAngular(() => {
      const isMobile = window.innerWidth < 600;
      this.chart?.destroy();
  
      this.chart = new Chart(this.leagueChart.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true,
              labels: {
                boxWidth: isMobile ? 10 : 18,
                font: {
                  size: isMobile ? 10 : 12
                }
              }
              }
          },
          scales: {
              x: {
              type: 'category',
              grid: {
                display: false,
                color: 'rgba(255, 255, 255, 0.2)',
              },
              ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: isMobile ? 5 : 10,
                font: {
                  size: isMobile ? 10 : 12
                }
              }
            },
            y: {
              type: 'linear',
              reverse: this.selectedStat == 'rank' || this.selectedStat == 'weeklyRank' ? true : false,
              ticks: {
                padding: 6,
                font: {
                  size: window.innerWidth < 600 ? 10 : 12
                },
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
    })
  }

  renderPieChart() {
    console.log("renderPieChart", this._chartEndGw);
    
    if (!this.leagueChart) return;
    

    const teamLabels = [
      "Arsenal",
      "Aston Villa",
      "Burnley",
      "Bournemouth",
      "Brentford",
      "Brighton",
      "Chelsea",
      "Crystal Palace",
      "Everton",
      "Fulham",
      "Leeds",
      "Liverpool",
      "Manchester City",
      "Manchester United",
      "Newcastle",
      "Nottingham Forest",
      "Sunderland",
      "Tottenham",
      "West Ham",
      "Wolves"
    ]
    
    const posLabels = [
      "Goalkeepers", "Defenders", "Midfielders", "Strikers"
    ]

    const clubGradientColors: { primary: string; secondary?: string }[] = [
      { primary: "#EF0107", secondary: "#FFFFFF" }, // Arsenal
      { primary: "#670E36", secondary: "#95BFE5" }, // Aston Villa
      { primary: "#6C1D45", secondary: "#99D6EA" }, // Burnley
      { primary: "#DA291C", secondary: "#000000" }, // Bournemouth
      { primary: "#E30613", secondary: "#FFFFFF" }, // Brentford
      { primary: "#0057B8", secondary: "#FFFFFF" }, // Brighton
      { primary: "#034694" }, // Chelsea
      { primary: "#1B458F", secondary: "#C4122E" }, // Crystal Palace
      { primary: "#003399" }, // Everton
      { primary: "#ffffff", secondary: "#040000c0" }, // Fulham
      { primary: "#ffffff", secondary: "#FFCD00" }, // Leeds
      { primary: "#C8102E"}, // Liverpool
      { primary: "#6CABDD"}, // Manchester City
      { primary: "#DA291C" }, // Manchester United
      { primary: "#000000", secondary: "#FFFFFF" }, // Newcastle
      { primary: "#DD0000"}, // Nottingham Forest
      { primary: "#EB172B", secondary: "#FFFFFF" }, // Sunderland
      { primary: "#ffffff", secondary: "#132257" }, // Tottenham
      { primary: "#7A263A", secondary: "#1BB1E7" }, // West Ham
      { primary: "#FDB913" }, // Wolves
    ];

    const ctx = this.leagueChart.nativeElement.getContext("2d");
    if (!ctx) return; 

    // const gradients = clubGradientColors.map(colors => {
    //   const gradient = ctx.createRadialGradient(
    //     200, 200, 20,   // inner circle
    //     200, 200, 200   // outer circle
    //   );

    //   gradient.addColorStop(0, colors.primary);
    //   gradient.addColorStop(1, colors.secondary);

    //   return gradient;
    // });

    const datasets = [
      {
        data: this.getPieChartData(this.teams[0]),
        // backgroundColor: gradients,
        borderColor: this.selectedStat == 'pointsByClub' ? clubGradientColors.map(c => c.secondary || c.primary) : undefined,
        borderWidth: 2,
        backgroundColor: this.selectedStat === 'pointsByClub' ? clubGradientColors.map(c => c.primary) : undefined,
      }
    ]
    console.log(this.getPieChartData(this.teams[0]));
    // console.log(datasets)

    this.zone.runOutsideAngular(() => {
      const isMobile = window.innerWidth < 600;
      this.chart?.destroy();
  
      this.chart = new Chart(this.leagueChart.nativeElement, {
        type: 'pie',
        data: {
          labels: this.selectedStat == 'pointsByClub' ? teamLabels : posLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false,
              position: 'top',
              labels: {
                boxWidth: isMobile ? 5 : 10,
                font: {
                  size: isMobile ? 6 : 10,
                }
              }
            },
          }
        },
      })
    })
  }

  getStatValue(squad: Squad): number {
    switch (this.selectedStat) {
      case 'gwPoints':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.points;
      case 'totalPoints':
        this.showProjectionsBox = true;
        this.showCumulative = false
        return squad.total_points;
      case 'squadValue':
        this.showProjectionsBox = false;
        this.showCumulative = false
        return (squad.value - squad.bank)/10;
      case 'pointsOnBench':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.points_on_bench;
      case 'rank':
        this.showProjectionsBox = false;
        this.showCumulative = false
        return this.isLeague ? squad.rank : squad.overall_rank;
      case 'weeklyRank':
        this.showProjectionsBox = false;
        this.showCumulative = false
        return this.isLeague ? squad.weekly_rank : squad.rank;
      case 'goalsScored':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.goals_scored;
      case 'assists':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.assists;
      case 'cleanSheets':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.clean_sheets;
      case 'saves':
        this.showProjectionsBox = false;
        this.showCumulative = true
        return squad.saves;
      default:
        return 0;
    }
  }

  getPieChartData(team: Team): number[] {
    switch(this.selectedStat){
      case 'pointsByClub':
        this.showProjectionsBox = false;
        this.showCumulative = false;
        return team.contributionsByClub.map(team => team.total_points);
      case 'pointsByPos':
        this.showProjectionsBox = false;
        this.showCumulative = false;
        return team.contributionsByPosition.map(team => team.total_points);
      default:
        return [];
    }
  }

  private createProjection(team: Team, data: number[], fromGw: number){
      
    switch (this.selectedProjectionStat) {
      case 'pointsPerGw':
        var t = team.total, ppgw = (team.total/(this.currentGw.id-team.started_event+1));
        for (let i: number = this.currentGw.id+1; i <= 38; i++) {
          t += ppgw;
          data[i-fromGw] = Math.trunc(t);
        }

        return
      case 'teamForm':
        var t = team.total, form = 0;
        for (let i: number = 0; i <= 4; i++){
          form += team.squad_by_gw[this.currentGw.id - i].points;
        }
        form /= 5;
        for (let i: number = this.currentGw.id+1; i <= 38; i++) {
          t += form;
          data[i-fromGw] = Math.trunc(t);
        }
        return;
      default:
        return;
    }
  }

  ngAfterViewInit() {
    
    this.tryRender();
  }
}

export type StatOption = 
  | 'gwPoints' 
  | 'totalPoints' 
  | 'squadValue' 
  | 'pointsOnBench' 
  | 'rank' 
  | 'weeklyRank'
  | 'goalsScored'
  | 'assists'
  | 'cleanSheets'
  | 'saves'
  | 'pointsByClub'
  | 'pointsByPos'
  ;

export type ProjectionStatOption = 
  | 'pointsPerGw'
  | 'teamForm'
  | 'squadForm'

