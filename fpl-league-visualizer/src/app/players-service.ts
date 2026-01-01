import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PlayersCumulativeDto, StaticDataDto } from './StaticDataDTO';

@Injectable({
  providedIn: 'root',
})
export class PlayersService {
  constructor(private http: HttpClient) {}

  getStaticData(){
    return this.http.get<StaticDataDto>(`https://localhost:7043/api/bootstrap-static`);
  }

  getPlayerData(id: number){
    return this.http.get<PlayersCumulativeDto>(`https://localhost:7043//api/element-summary/${id}`)
  }
}
