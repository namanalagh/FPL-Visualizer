import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FavouritesService {
  private readonly KEY = 'favourite_leagues';
  
  getAll(): FavouriteLeague[]{
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  } 

  isFavourite(id: number): boolean {
    return this.getAll().some(l => l.id === id);
  }

  add(league: FavouriteLeague) {
    const favs = this.getAll();
    if (!favs.some(l => l.id === league.id)) {
      favs.push(league);
      localStorage.setItem(this.KEY, JSON.stringify(favs));
    }
  }

  remove(id: number) {
    const favs = this.getAll().filter(l => l.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(favs));
  }

  toggle(league: FavouriteLeague) {
    this.isFavourite(league.id)
      ? this.remove(league.id)
      : this.add(league);
  }
} 

export interface FavouriteLeague {
  id: number;
  name: string;
}