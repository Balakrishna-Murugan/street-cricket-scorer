import { isMaidenOver, getAvailableBatsmen, checkMatchEnd } from '../matchHelpers';
import { countLegalDeliveries, recalcBallsFromPreviousState, applyUndoSnapshot } from '../matchHelpers';
import { BallOutcome, Match, Player } from '../../types';

describe('matchHelpers', () => {
  test('isMaidenOver returns true for zero-run legal over', () => {
    const over: BallOutcome[] = [
      { ballNumber: 1, runs: 0, isWicket: false },
      { ballNumber: 2, runs: 0, isWicket: false },
      { ballNumber: 3, runs: 0, isWicket: false },
      { ballNumber: 4, runs: 0, isWicket: false },
      { ballNumber: 5, runs: 0, isWicket: false },
      { ballNumber: 6, runs: 0, isWicket: false }
    ];

    expect(isMaidenOver(over)).toBe(true);
  });

  test('isMaidenOver returns false when over has runs or illegal extras', () => {
    const overWithRuns: BallOutcome[] = [
      { ballNumber: 1, runs: 1, isWicket: false }
    ];
    const overWithWide: BallOutcome[] = [
      { ballNumber: 0, runs: 1, isWicket: false, extras: { type: 'wide', runs: 1 } }
    ];

    expect(isMaidenOver(overWithRuns)).toBe(false);
    expect(isMaidenOver(overWithWide)).toBe(false);
  });

  test('getAvailableBatsmen filters by team and out status', () => {
    const players: Player[] = [
      { _id: 'p1', name: 'A', age: 20, role: 'batsman', teams: ['t1'] },
      { _id: 'p2', name: 'B', age: 21, role: 'batsman', teams: ['t1'] },
      { _id: 'p3', name: 'C', age: 22, role: 'batsman', teams: ['t2'] }
    ];

    const match: Match = {
      _id: 'm1',
      team1: 't1',
      team2: 't2',
      date: '',
      overs: 10,
      status: 'in-progress',
      innings: [
        {
          battingTeam: 't1',
          bowlingTeam: 't2',
          totalRuns: 10,
          wickets: 1,
          overs: 1,
          balls: 6,
          isCompleted: false,
          battingStats: [
            { player: 'p1', runs: 10, balls: 6, fours: 0, sixes: 0, isOut: true, strikeRate: 0, isOnStrike: false }
          ],
          bowlingStats: [],
          currentState: { currentOver: 0, currentBall: 0, lastBallRuns: 0 },
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
          runRate: 0
        }
      ],
      currentInnings: 0,
      matchSettings: { oversPerBowler: 4, maxPlayersPerTeam: 11 },
      bowlerRotation: { bowlerOversCount: {}, availableBowlers: [] }
    };

    const available = getAvailableBatsmen(match, players, 0);
    expect(available.map(p => p._id)).toEqual(['p2']);
  });

  test('checkMatchEnd detects target reached and marks match completed', () => {
    const match: Match = {
      _id: 'm2',
      team1: 't1',
      team2: 't2',
      date: '',
      overs: 10,
      status: 'in-progress',
      innings: [
        { battingTeam: 't1', bowlingTeam: 't2', totalRuns: 50, wickets: 3, overs: 10, balls: 60, isCompleted: true, battingStats: [], bowlingStats: [], currentState: { currentOver: 0, currentBall: 0, lastBallRuns: 0 }, extras: { wides:0,noBalls:0,byes:0,legByes:0,total:0 }, runRate: 0 },
        { battingTeam: 't2', bowlingTeam: 't1', totalRuns: 51, wickets: 2, overs: 9, balls: 54, isCompleted: false, battingStats: [], bowlingStats: [], currentState: { currentOver: 0, currentBall: 0, lastBallRuns: 0 }, extras: { wides:0,noBalls:0,byes:0,legByes:0,total:0 }, runRate: 0 }
      ],
      currentInnings: 1,
      matchSettings: { oversPerBowler: 4, maxPlayersPerTeam: 11 },
      bowlerRotation: { bowlerOversCount: {}, availableBowlers: [] }
    };

    const ended = checkMatchEnd(match, 1);
    expect(ended).toBe(true);
    expect(match.status).toBe('completed');
    expect(match.result).toMatch(/won by/);
  });

  test('countLegalDeliveries and recalcBallsFromPreviousState compute correct counts', () => {
    const overBalls: any[] = [
      { ballNumber: 1, runs: 0 },
      { ballNumber: 2, runs: 1 },
      { ballNumber: 0, runs: 1, extras: { type: 'wide', runs: 1 } },
      { ballNumber: 3, runs: 0 }
    ];

    expect(countLegalDeliveries(overBalls)).toBe(3);

    const prevState = { balls: 10, currentOverBalls: overBalls };
    const recalc = recalcBallsFromPreviousState(prevState as any);
    // previous balls 10, overBalls length 4, legalDeliveries 3 -> balls = 10 - (4-3) = 9
    expect(recalc.balls).toBe(9);
    expect(recalc.remainingBalls).toBe(9 % 6);
  });

  test('applyUndoSnapshot restores inning and returns local UI state', () => {
    const match: any = {
      _id: 'mtest',
      team1: 't1',
      team2: 't2',
      date: '',
      overs: 10,
      status: 'in-progress',
      innings: [
        {
          battingStats: [ { player: 'p1', runs: 5, balls: 3, isOut: false }, { player: 'p2', runs: 0, balls: 0, isOut: false } ],
          bowlingStats: [ { player: 'b1', overs: 1, runs: 10, wickets: 0, balls: 6 } ],
          totalRuns: 5,
          wickets: 0,
          balls: 3,
          currentOverBalls: []
        }
      ],
      currentInnings: 0,
      matchSettings: { oversPerBowler: 4, maxPlayersPerTeam: 11 },
      bowlerRotation: { bowlerOversCount: {}, availableBowlers: [] }
    } as unknown as Match;

    const prevState = {
      totalRuns: 3,
      wickets: 1,
      balls: 2,
      currentOverBalls: [ { ballNumber: 1, runs: 0 }, { ballNumber: 2, runs: 1 } ],
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      striker: 'p1',
      nonStriker: 'p2',
      bowler: 'b1',
      strikerStats: { runs: 3, balls: 2 },
      nonStrikerStats: { runs: 0, balls: 0 },
      bowlerStats: { overs: 0.2, runs: 3, wickets: 1, balls: 2 }
    };

    const local = applyUndoSnapshot(match, prevState, 0) as any;
    expect(local).not.toBeNull();
    expect(match.innings[0].totalRuns).toBe(3);
    expect(match.innings[0].wickets).toBe(1);
    expect(match.innings[0].currentOverBalls.length).toBe(2);
    expect(local.striker).toBe('p1');
    expect(local.bowler).toBe('b1');
  });

});
