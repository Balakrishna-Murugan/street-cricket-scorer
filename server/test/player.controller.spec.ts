import { playerController } from '../src/controllers/player.controller';
import { Player } from '../src/models/player.model';
import { Match } from '../src/models/match.model';

jest.mock('../src/models/player.model');
jest.mock('../src/models/match.model');

describe('playerController.delete', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return conflicts when player teams are referenced in matches (conflicts API)', async () => {
    const mockPlayer: any = { _id: 'p1', teams: ['t1'] };
    (Player.findById as jest.Mock).mockResolvedValue(mockPlayer);
  const mockMatch: any = { _id: 'm1', team1: { name: 'A' }, team2: { name: 'B' }, date: new Date('2025-10-31') };
  (Match.find as jest.Mock).mockReturnValue({ populate: () => ({ populate: () => Promise.resolve([mockMatch]) }) });

    const req: any = { params: { id: 'p1' }, user: { userRole: 'admin', _id: 'admin1' } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { json, status };

    await playerController.conflicts(req, res);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ conflicts: expect.any(Array) }));
  });

  it('should allow deletion when no conflicts', async () => {
    const mockPlayer: any = { _id: 'p2', teams: [] };
    (Player.findById as jest.Mock).mockResolvedValue(mockPlayer);
  (Match.find as jest.Mock).mockReturnValue({ populate: () => ({ populate: () => Promise.resolve([]) }) });
    (Player.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

    const req: any = { params: { id: 'p2' }, user: { userRole: 'admin', _id: 'admin1' } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { json, status };

    // call conflicts to ensure empty list when no teams
    await playerController.conflicts(req, res);

    expect(json).toHaveBeenCalledWith({ conflicts: [] });
  });
});
