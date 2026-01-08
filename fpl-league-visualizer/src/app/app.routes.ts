import { Routes } from '@angular/router';
import { Standings } from './standings/standings';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'league',
        pathMatch: 'full'
    },
    {
        path: 'league',
        component: Standings
    },
    {
        path: 'league/:leagueId',
        component: Standings
    },
    {
        path: '**',
        redirectTo: 'league'
    }
];
