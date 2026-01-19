import { ChangeDetectorRef, Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Analytics, isSupported, logEvent } from '@angular/fire/analytics';
import { filter } from 'rxjs';
import { Standings } from './standings/standings';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Standings],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('fpl-league-visualizer');

  private analytics = inject(Analytics);
  private router = inject(Router);

  constructor(private ref: ChangeDetectorRef) {
      isSupported().then((supported) => {
      if (!supported) return; // GA not available

      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe((e: NavigationEnd) => {
          logEvent(this.analytics, 'page_view', { page_path: e.urlAfterRedirects });
          console.log('page_view logged', e.urlAfterRedirects); // log manually
        });
    });
  }

  ngAfterContentChecked() {
    this.ref.detectChanges();
  }
}
