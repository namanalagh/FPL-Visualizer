import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerStatsTable } from './player-stats-table';

describe('PlayerStatsTable', () => {
  let component: PlayerStatsTable;
  let fixture: ComponentFixture<PlayerStatsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerStatsTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerStatsTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
