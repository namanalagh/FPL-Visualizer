import { ChangeDetectorRef, Component } from '@angular/core';
import { StandingsService } from '../standings-service';
import { Team, Transfer } from '../standings/standingsVM';
import { map, pipe, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Graph } from '../shared/graph/graph';
import { EventsDto, StaticDataDto } from '../StaticDataDTO';
import { PlayersService } from '../players-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabBar } from "../shared/tab-bar/tab-bar";

@Component({
  selector: 'app-entry',
  imports: [CommonModule, FormsModule, Graph, TabBar],
  templateUrl: './entry.html',
  styleUrl: './entry.css',
})
export class Entry {
  entry!: Team;
  entryIdInput!: number;
  staticData!: StaticDataDto
  currentGw!: EventsDto
  loading = false;
  groupedTransfers: any[] = []
  
  constructor(
    private standingsService: StandingsService, 
    private route: ActivatedRoute, 
    private playersService: PlayersService, 
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  fetchEntry(userId: number){
    this.loading = true;
    this.standingsService.getLeagueEntry(userId).pipe(
      map(
        dto => {
          this.entry = new Team(); 

          this.entry.id = dto.id;
          this.entry.entry_name = dto.name;
          this.entry.player_name = dto.player_first_name + " " + dto.player_last_name;
          this.entry.started_event = dto.started_event;
          this.entry.event_total = dto.summary_event_points;
          this.entry.total = dto.summary_overall_points;
        }
      ),
      switchMap(team =>
        this.standingsService.attachTeamPicks([this.entry], this.currentGw.id).pipe(
          map(() => team) 
        )
      ),
      switchMap (_ => 
        this.standingsService.getEntryTransfers(this.entry.id, this.currentGw.id).pipe(
          map(transfers => {
            this.entry.transfers = transfers;
            
            const grouped = transfers.reduce<Record<number, Transfer[]>>((acc, transfer) => {
              if(!acc[transfer.gw]){
                acc[transfer.gw] = [];
              }
            
              acc[transfer.gw].push(transfer);
              
              return acc;
            }, {})

            this.groupedTransfers = Object.keys(grouped).map(gw => ({
              gw: +gw,
              transfers: grouped[+gw],
              expanded: false,
              totalImpact: grouped[+gw].reduce((sum, t) =>
                sum + (t.in_player.total_points - t.out_player.total_points), 0
              ),
              moneySpent: grouped[+gw].reduce((sum, t) =>
                sum + ((t.out_cost/10) - (t.in_cost/10)), 0
              ),
            })).reverse()
          })
        )
      )
    )
    .subscribe(team => {
      this.entry.getPlayerContributions(0, this.currentGw.id, (id, gw) => this.playersService.getPlayerGwStats(id, gw), id => this.playersService.getPlayerInfo(id));
      console.log(this.entry, "Team with picks attached");
      this.loading = false;
      this.cdr.detectChanges();
    })
  }

  ngOnInit(){
    this.playersService.getStaticData().subscribe({
      next: data => {
        this.staticData = data;
        this.currentGw = data.events?.find(gw => gw.is_current)!;
        this.route.paramMap.subscribe(params => {
          const entryId = Number(params.get('entryId'));
          
          if (entryId) {
            this.entryIdInput = entryId;
              this.fetchEntry(entryId);
            }
          }
        )
        this.cdr.detectChanges();
        
      },
      error: err => {
        console.error(err);
      }
    });
  }
}


// 10018645