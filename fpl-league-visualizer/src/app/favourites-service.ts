import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FavouritesService {
  private readonly LEAGUEKEY = 'favourite_leagues';
  private readonly ENTRYKEY = 'favourite_entries';
  
  getAll(type: number): Favourite[]{
    const raw = localStorage.getItem(type == 0 ? this.LEAGUEKEY : this.ENTRYKEY);
    return raw ? JSON.parse(raw) : [];
  } 

  isFavourite(id: number, type: number): boolean {
    return this.getAll(type).some(l => l.id === id);
  }

  add(fav: Favourite, type: number) {
    const favs = this.getAll(type);
    if (!favs.some(l => l.id === fav.id)) {
      favs.push(fav);
      localStorage.setItem(type == 0 ? this.LEAGUEKEY : this.ENTRYKEY, JSON.stringify(favs));
    }
  }

  remove(id: number, type: number) {
    const favs = this.getAll(type).filter(l => l.id !== id);
    localStorage.setItem(type == 0 ? this.LEAGUEKEY : this.ENTRYKEY, JSON.stringify(favs));
  }

  toggle(fav: Favourite, type: number) {
    this.isFavourite(fav.id, type)
      ? this.remove(fav.id, type)
      : this.add(fav, type);
  }
} 

export interface Favourite {
  type: number; // 0-league, 1-entry
  id: number;
  name: string;
}