import { AuditLogService } from './audit-log.service';
import { AuditAction, AuditDomain } from '../constants/audit.constants';
import { DomainAuditLogsRepository } from '../repositories/domain-audit-logs.repository';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Pick<DomainAuditLogsRepository, 'insert' | 'findById' | 'findManyFiltered'>>;

  beforeEach(() => {
    repository = {
      insert: jest.fn().mockResolvedValue({ id: 'a1' }),
      findById: jest.fn(),
      findManyFiltered: jest.fn(),
    };
    service = new AuditLogService(repository as unknown as DomainAuditLogsRepository);
  });

  describe('record', () => {
    it('persists audit event', async () => {
      await service.record({
        domain: AuditDomain.AGENT,
        action: AuditAction.CREATED,
        resourceType: 'agent',
        resourceId: '11111111-1111-1111-1111-111111111111',
        resourceCode: 'demo',
        actorUserId: '22222222-2222-2222-2222-222222222222',
      });

      expect(repository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: AuditDomain.AGENT,
          action: AuditAction.CREATED,
          resourceCode: 'demo',
        }),
      );
    });

    it('swallows insert errors (best-effort)', async () => {
      repository.insert.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.record({
          domain: AuditDomain.AGENT,
          action: AuditAction.UPDATED,
          resourceType: 'agent',
          resourceId: '11111111-1111-1111-1111-111111111111',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns mapped data and meta', async () => {
      const createdAt = new Date('2026-07-20T00:00:00.000Z');
      repository.findManyFiltered.mockResolvedValueOnce([
        [
          {
            id: 'a1',
            domain: AuditDomain.AGENT,
            action: AuditAction.CREATED,
            resourceType: 'agent',
            resourceId: '11111111-1111-1111-1111-111111111111',
            resourceCode: 'demo',
            actorUserId: null,
            ip: null,
            userAgent: null,
            metadata: null,
            createdAt,
          },
        ],
        1,
      ]);

      const result = await service.list({ page: 1, limit: 20, domain: AuditDomain.AGENT });

      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].domain).toBe(AuditDomain.AGENT);
      expect(repository.findManyFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ domain: AuditDomain.AGENT, page: 1, limit: 20 }),
      );
    });
  });

  describe('findById', () => {
    it('throws when missing', async () => {
      repository.findById.mockResolvedValueOnce(null);
      await expect(service.findById('11111111-1111-1111-1111-111111111111')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
