import { ChangeDetectorRef, Component } from '@angular/core';
import { StandingsService } from '../standings-service';
import { Team } from '../standings/standingsVM';
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
  
  constructor(
    private standingsService: StandingsService, 
    private route: ActivatedRoute, 
    private playersService: PlayersService, 
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  fetchEntry(userId: number){
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
        
          console.log(this.entry, "Entry")
        }
      ),
      switchMap(team =>
        this.standingsService.attachTeamPicks([this.entry], this.currentGw.id).pipe(
        map(() => team) 
      )
    )
    ).subscribe(team => {
      console.log(this.entry, "Team with picks attached");
      this.cdr.detectChanges();
    });
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