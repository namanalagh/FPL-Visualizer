import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Standings } from './standings/standings';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Standings],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fpl-league-visualizer');

  constructor(private ref: ChangeDetectorRef){}

  ngAfterContentChecked() { 
    this.ref.detectChanges(); 
  }
}
