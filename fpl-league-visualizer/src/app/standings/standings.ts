import { Component, ElementRef, HostListener, NgZone, ViewChild } from '@angular/core';
import { StandingsService } from '../standings-service';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Squad, StandingsVM, Team } from './standingsVM';
import { Chart, ScriptableLineSegmentContext  } from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { PlayersService } from '../players-service';
import { EventsDto, StaticDataDto } from '../StaticDataDTO';
import { Favourite, FavouritesService } from '../favourites-service';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ChipType } from './standingsDTO';
import { Graph } from "../shared/graph/graph";

@Component({
  selector: 'app-standings',
  imports: [CommonModule, FormsModule, Graph],
  standalone: true,
  templateUrl: './standings.html',
  styleUrl: './standings.css',
})
export class Standings {
  standings!: StandingsVM;
  results: Team[] = [];
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
  showFavourites = false
  favourites!: Favourite[]

  get isFavourite(): boolean {
    return !!this.standings && this.favouritesService.isFavourite(this.standings.leagueId, 0);
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
  

  
  calculateStats(){  
    this.resetStats();
    this.results.forEach(res => {
      this.totalPts += res.total;
      this.totalValue += res.squad_by_gw[this.currentGw.id].value;
      this.gwAvg += res.event_total;
    });

    this.gwAvg /= this.results.length;
    // this.renderChart(this.chartStartGw, this.chartEndGw);
    // this.cdr.detectChanges();
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

  toggleFavourite(event: MouseEvent) {
    event.stopPropagation();

    if (!this.standings) return;

    const league = {
      type: 0,
      id: this.standings.leagueId,
      name: this.standings.leagueName
    };

    if (this.isFavourite) {
      this.favouritesService.remove(league.id, 0);
    } else {
      this.favouritesService.add(league, 0);
    }

    this.favourites = this.favouritesService.getAll(0);
  }

  hideFavourites() {
    setTimeout(() => (this.showFavourites = false), 150);
  }

  resetStats(){
    this.totalPts = 0;
    this.totalValue = 0;
    this.gwAvg = 0;
  }

  selectFavourite(fav: Favourite){
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

  goToEntry(id: number){
    this.router.navigate(['//entry', id]);
  }
  
  ngOnInit() {
    this.favourites = this.favouritesService.getAll(0);
    this.playersService.getStaticData().subscribe({
      next: data => {
        this.staticData = data;
        this.currentGw = data.events?.find(gw => gw.is_current)!;
        

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


  // OUR LEAGUE: 2246597