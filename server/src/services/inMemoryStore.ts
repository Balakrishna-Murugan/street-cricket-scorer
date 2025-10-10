// In-memory store for development/testing
export class InMemoryStore {
  private static instance: InMemoryStore;
  private players: any[] = [];
  private teams: any[] = [];
  private matches: any[] = [];
  private idCounter = 1;

  private constructor() {
    // Add initial teams
    const team1Id = this.generateId();
    const team2Id = this.generateId();
    
    this.teams = [
      {
        _id: team1Id,
        name: 'Super Kings',
        captain: 'MS Dhoni',
        members: []
      },
      {
        _id: team2Id,
        name: 'Royal Challengers',
        captain: 'Virat Kohli',
        members: []
      }
    ];

    // Add initial players
    const player1Id = this.generateId();
    const player2Id = this.generateId();
    const player3Id = this.generateId();
    const player4Id = this.generateId();
    
    this.players = [
      {
        _id: player1Id,
        name: 'MS Dhoni',
        age: 42,
        role: 'batsman',
        battingStyle: 'right-handed',
        bowlingStyle: 'right-arm medium',
        teams: [team1Id]
      },
      {
        _id: player2Id,
        name: 'Virat Kohli',
        age: 36,
        role: 'batsman',
        battingStyle: 'right-handed',
        bowlingStyle: '',
        teams: [team2Id]
      },
      {
        _id: player3Id,
        name: 'Jadeja',
        age: 32,
        role: 'all-rounder',
        battingStyle: 'left-handed',
        bowlingStyle: 'left-arm spin',
        teams: [team1Id]
      },
      {
        _id: player4Id,
        name: 'Maxwell',
        age: 34,
        role: 'all-rounder',
        battingStyle: 'right-handed',
        bowlingStyle: 'right-arm off-spin',
        teams: [team2Id]
      }
    ];

    // Update team members
    this.teams[0].members = [player1Id, player3Id];
    this.teams[1].members = [player2Id, player4Id];

    // Add a sample match
    const matchId = this.generateId();
    this.matches = [
      {
        _id: matchId,
        team1: team1Id,
        team2: team2Id,
        date: new Date(),
        overs: 20,
        status: 'upcoming',
        venue: 'Street Cricket Ground',
        innings: [{
          battingTeam: team1Id,
          bowlingTeam: team2Id,
          totalRuns: 0,
          wickets: 0,
          overs: 0,
          battingStats: [],
          bowlingStats: [],
          extras: {
            wides: 0,
            noBalls: 0,
            byes: 0,
            legByes: 0
          }
        }]
      }
    ];
  }

  static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  private generateId(): string {
    return (this.idCounter++).toString();
  }

  // Player operations
  async addPlayer(player: any) {
    const newPlayer = { ...player, _id: this.generateId() };
    this.players.push(newPlayer);
    return newPlayer;
  }

  async getPlayers() {
    return this.players;
  }

  async getPlayerById(id: string) {
    return this.players.find(p => p._id === id);
  }

  async updatePlayer(id: string, data: any) {
    const index = this.players.findIndex(p => p._id === id);
    if (index === -1) return null;
    this.players[index] = { ...this.players[index], ...data };
    return this.players[index];
  }

  async deletePlayer(id: string) {
    const index = this.players.findIndex(p => p._id === id);
    if (index === -1) return null;
    const player = this.players[index];
    this.players.splice(index, 1);
    return player;
  }

  // Team operations
  async addTeam(team: any) {
    const newTeam = { ...team, _id: this.generateId() };
    this.teams.push(newTeam);
    return newTeam;
  }

  async getTeams() {
    return this.teams;
  }

  async getTeamById(id: string) {
    return this.teams.find(t => t._id === id);
  }

  async updateTeam(id: string, data: any) {
    const index = this.teams.findIndex(t => t._id === id);
    if (index === -1) return null;
    this.teams[index] = { ...this.teams[index], ...data };
    return this.teams[index];
  }

  async deleteTeam(id: string) {
    const index = this.teams.findIndex(t => t._id === id);
    if (index === -1) return null;
    const team = this.teams[index];
    this.teams.splice(index, 1);
    return team;
  }

  // Match operations
  async addMatch(match: any) {
    const newMatch = { ...match, _id: this.generateId() };
    this.matches.push(newMatch);
    return newMatch;
  }

  async getMatches() {
    return this.matches;
  }

  async getMatchById(id: string) {
    return this.matches.find(m => m._id === id);
  }

  async updateMatch(id: string, data: any) {
    const index = this.matches.findIndex(m => m._id === id);
    if (index === -1) return null;
    this.matches[index] = { ...this.matches[index], ...data };
    return this.matches[index];
  }

  async deleteMatch(id: string) {
    const index = this.matches.findIndex(m => m._id === id);
    if (index === -1) return null;
    const match = this.matches[index];
    this.matches.splice(index, 1);
    return match;
  }
}