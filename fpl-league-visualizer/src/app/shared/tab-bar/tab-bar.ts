import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventsDto } from '../../StaticDataDTO';
import { Title } from '@angular/platform-browser';
import { Favourite, FavouritesService } from '../../favourites-service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-tab-bar',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.css',
})
export class TabBar {
  @Input() currentGw!: EventsDto
  @Input() title!: string
  @Input() isLeague!: boolean
  @Input() idInput!: number

  showFavourites = false
  favourites!: Favourite[]
  
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

  get placeHolder(): string {
    return this.isLeague ? "League" : "Entry";
  }

  get isFavourite(): boolean {
    return !!this.title && this.favouritesService.isFavourite(this.idInput, +!this.isLeague);
  }

  constructor(private favouritesService: FavouritesService, private router: Router){}

  toggleFavourite(event: MouseEvent) {
    event.stopPropagation();

    if (!this.title || !this.idInput) return;
    const fav = {
      type: +!this.isLeague,
      id: this.idInput,
      name: this.title
    };
    
    if (this.isFavourite) {
      this.favouritesService.remove(fav.id, +!this.isLeague);
    } else {
      this.favouritesService.add(fav, +!this.isLeague);
      console.log(this.favouritesService.getAll(+!this.isLeague))
    }

    this.favourites = this.favouritesService.getAll(+!this.isLeague);
  }

  hideFavourites() {
    setTimeout(() => (this.showFavourites = false), 150);
  }

  selectFavourite(fav: Favourite){
    this.idInput = fav.id;
    this.loadResult(fav.id);
  }

  loadResult(id: number){
    if (!id || id <= 0) {
      console.log(id, "!")
      return;
    }
    console.log(id)
  
    this.router.navigate([this.isLeague ? '/league' : '/entry', id]);
  }

  ngOnInit(){
    this.favourites = this.favouritesService.getAll(+!this.isLeague);
    console.log(this.title)
  }
}
