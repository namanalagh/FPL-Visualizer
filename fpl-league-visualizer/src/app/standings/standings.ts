import { Component, ElementRef, HostListener, NgZone, ViewChild } from '@angular/core';
import { StandingsService } from '../standings-service';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Squad, StandingsVM, Team } from './standingsVM';
import { Chart, ScriptableLineSegmentContext  } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { PlayersService } from '../players-service';
import { EventsDto, StaticDataDto } from '../StaticDataDTO';
import { FavouriteLeague, FavouritesService } from '../favourites-service';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ChipType } from './standingsDTO';

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
  selectedStat: StatOption = 'totalPoints';
  selectedProjectionStat: ProjectionStatOption = 'teamForm';
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
  currentGw!: EventsDto 
  projections = false
  _chartStartGw = 1;
  _chartEndGw = this.projections ? 38 : this.currentGw?.id ?? 38
  cumulative = false
  showCumulative = false
  _showProjectionsBox = false
  showFavourites = false
  favourites!: FavouriteLeague[]

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
    value = Math.min((this.projections && this.showProjectionsBox ? 38 : this.currentGw.id), value);
    value = Math.max(value, this._chartStartGw+1);

    this._chartEndGw = value;
    // this.renderChart(this.chartStartGw, this.chartEndGw)
  }
  get isFavourite(): boolean {
    return !!this.standings && this.favouritesService.isFavourite(this.standings.leagueId);
  }

  @ViewChild('searchContainer', { static: true })
  searchContainer!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.searchContainer.nativeElement.contains(event.target)) {
      this.showFavourites = false;
    }
    else {
      this.showFavourites = true;
    }
  }

  get avgPts(): number {
    return this.totalPts/this.results.length
  }
  get avgVal(): number{
    return this.totalValue/this.results.length/10
  }

  constructor(
    private standingsService: StandingsService, 
    private playersService: PlayersService, 
    private favouritesService: FavouritesService, 
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone
  ) {}
  
  onProjectionsChange(checked: boolean) {
    const maxGw = checked && this.showProjectionsBox ? 38 : this.currentGw.id;
    this.chartStartGw = Math.min(this.chartStartGw, this.currentGw.id-1)
    this.chartEndGw = maxGw;
    this.renderChart(this.chartStartGw, this.chartEndGw);
  }

  renderChart(fromGw: number = 1, uptoGw: number = 38) {
    console.log("renderChart", this._chartEndGw);
    if(!this.showProjectionsBox) {
      uptoGw = Math.min(uptoGw, this.currentGw.id);
    }
    if (!this.leagueChart) return;
    const top10Teams = this.standings.teams.slice(0, 10);
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
  
  calculateStats(){  
    this.resetStats();
    this.results.forEach(res => {
      this.totalPts += res.total;
      this.totalValue += res.squad_by_gw[this.currentGw.id].value;
      this.gwAvg += res.event_total;
    });

    
    
    this.gwAvg /= this.results.length;
    this.renderChart(this.chartStartGw, this.chartEndGw);
    // this.cdr.detectChanges();
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
        return squad.rank;
      case 'weeklyRank':
        this.showProjectionsBox = false;
        this.showCumulative = false
        return squad.weekly_rank;
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

  getChip(chip: ChipType): string {
    const isMobile = window.innerWidth < 600;
    switch (chip) {
      case '3xc':
        return isMobile ? 'TC' : 'Triple Captain';
      case 'bboost':
        return isMobile ? 'BB' : 'Bench Boost';
      case 'freehit':
        return isMobile ? 'FH' : 'Free Hit';
      case 'wildcard':
        return isMobile ? 'WC' : 'Wildcard';
      default:
        return ''
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

  toggleFavourite(event: MouseEvent) {
    event.stopPropagation();

    if (!this.standings) return;

    const league = {
      id: this.standings.leagueId,
      name: this.standings.leagueName
    };

    if (this.isFavourite) {
      this.favouritesService.remove(league.id);
    } else {
      this.favouritesService.add(league);
    }

    this.favourites = this.favouritesService.getAll();
  }

  hideFavourites() {
    setTimeout(() => (this.showFavourites = false), 150);
  }

  resetStats(){
    this.totalPts = 0;
    this.totalValue = 0;
    this.gwAvg = 0;
  }

  selectFavourite(fav: FavouriteLeague){
    this.leagueIdInput = fav.id;
    this.loadLeague();
  }

  private fetchLeague(leagueId: number) {
    this.loading = true;
    this.cdr.detectChanges();
    this.error = '';
    console.log("Fetching league", leagueId)

    this.standingsService
      .getLeagueStandingsWithPicks(leagueId, this.currentGw.id)
        .pipe(
          finalize(() => {
            this.zone.run(() => this.loading = false);
            this.standings.getTop10Owned(id => this.playersService.getPlayerInfo(id))
            this.standings.getPlayerContributions(0, this.currentGw.id, (id, gw) => this.playersService.getPlayerGwStats(id, gw), id => this.playersService.getPlayerInfo(id));
            this.cdr.detectChanges();
          })
        )
      .subscribe({
        next: vm => {
          this.standings = vm;
          this.standings.currentGw = this.currentGw.id;
          this.results = [...vm.teams];
          this.calculateStats();
          this.zone.run(() => this.loading = false);
          this.cdr.detectChanges();
        },
        error: err => {
          console.error(err);
          this.error = 'Failed to load league data';
          this.loading = false;
          this.cdr.detectChanges();
        }
      
      });
  }

  loadLeague(){
    if (!this.leagueIdInput || this.leagueIdInput <= 0) {
      return;
    }

    this.router.navigate(['/league', this.leagueIdInput]);
  }
  
  ngOnInit() {
    this.favourites = this.favouritesService.getAll();
    this.playersService.getStaticData().subscribe({
      next: data => {
        this.staticData = data;
        this.currentGw = data.events?.find(gw => gw.is_current)!;
        
        this.chartEndGw = this.currentGw?.id ?? 38;
        

        this.route.paramMap.subscribe(params => {
        const leagueId = Number(params.get('leagueId'));
        
        if (leagueId) {
          this.leagueIdInput = leagueId;
          this.fetchLeague(leagueId);
        }
      });
      },
      error: err => {
        console.error(err);
      }
    });
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
  | 'saves';

export type ProjectionStatOption = 
  | 'pointsPerGw'
  | 'teamForm'
  | 'squadForm'


  // OUR LEAGUE: 2246597