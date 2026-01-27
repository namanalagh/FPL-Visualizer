import { Routes } from '@angular/router';
import { Standings } from './standings/standings';
import { Entry } from './entry/entry';

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
        path: 'entry',
        component: Entry
    },
    {
        path: 'entry/:entryId',
        component: Entry
    },
    {
        path: '**',
        redirectTo: 'league'
    }
];
