import { teamController } from '../src/controllers/team.controller';
import { Team } from '../src/models/team.model';
import { Match } from '../src/models/match.model';

jest.mock('../src/models/team.model');
jest.mock('../src/models/match.model');

describe('teamController.delete', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should block deletion and return conflicts when team has in-progress matches', async () => {
    const mockTeam: any = { _id: 't1' };
    (Team.findById as jest.Mock).mockResolvedValue(mockTeam);
  const mockMatch: any = { _id: 'm1', team1: { name: 'A' }, team2: { name: 'B' }, date: new Date('2025-10-31') };
  (Match.find as jest.Mock).mockReturnValue({ populate: () => ({ populate: () => Promise.resolve([mockMatch]) }) });

    const req: any = { params: { id: 't1' }, user: { userRole: 'admin', _id: 'admin1' } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { json, status };

    await teamController.conflicts(req, res);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ conflicts: expect.any(Array) }));
  });

  it('should allow deletion when no in-progress matches', async () => {
    const mockTeam: any = { _id: 't2' };
    (Team.findById as jest.Mock).mockResolvedValue(mockTeam);
  (Match.find as jest.Mock).mockReturnValue({ populate: () => ({ populate: () => Promise.resolve([]) }) });
    (Team.findByIdAndDelete as jest.Mock).mockResolvedValue(true);

    const req: any = { params: { id: 't2' }, user: { userRole: 'admin', _id: 'admin1' } };
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res: any = { json, status };

    await teamController.conflicts(req, res);

    expect(json).toHaveBeenCalledWith({ conflicts: [] });
  });
});
