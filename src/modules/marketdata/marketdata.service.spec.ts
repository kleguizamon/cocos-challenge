import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MarketdataService } from './marketdata.service';
import { MarketData } from '../../entities/marketdata.entity';

describe('MarketdataService', () => {
	let service: MarketdataService;
	let marketDataRepository: jest.Mocked<Repository<MarketData>>;

	const mockMarketData: Partial<MarketData>[] = [
		{
			id: 1,
			instrumentId: 1,
			open: 148.5,
			high: 152.3,
			low: 147.8,
			close: 150.0,
			previousClose: 149.2,
			date: new Date('2023-12-01'),
		},
		{
			id: 2,
			instrumentId: 1,
			open: 149.8,
			high: 151.5,
			low: 148.9,
			close: 151.2,
			previousClose: 150.0,
			date: new Date('2023-12-02'),
		},
		{
			id: 3,
			instrumentId: 2,
			open: 245.0,
			high: 248.7,
			low: 244.1,
			close: 247.5,
			previousClose: 245.8,
			date: new Date('2023-12-01'),
		},
		{
			id: 4,
			instrumentId: 2,
			open: 247.2,
			high: 249.9,
			low: 246.8,
			close: 248.3,
			previousClose: 247.5,
			date: new Date('2023-12-02'),
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MarketdataService,
				{
					provide: getRepositoryToken(MarketData),
					useValue: {
						findOne: jest.fn(),
						createQueryBuilder: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<MarketdataService>(MarketdataService);
		marketDataRepository = module.get(getRepositoryToken(MarketData));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getLatestMarketData', () => {
		it('should return latest market data for instrument', async () => {
			const latestData = mockMarketData[1]; // More recent date for instrument 1
			marketDataRepository.findOne.mockResolvedValue(
				latestData as MarketData
			);

			const result = await service.getLatestMarketData(1);

			expect(marketDataRepository.findOne).toHaveBeenCalledWith({
				where: { instrumentId: 1 },
				order: { date: 'DESC' },
			});
			expect(result).toEqual(latestData);
		});

		it('should return null when no market data exists for instrument', async () => {
			marketDataRepository.findOne.mockResolvedValue(null);

			const result = await service.getLatestMarketData(999);

			expect(marketDataRepository.findOne).toHaveBeenCalledWith({
				where: { instrumentId: 999 },
				order: { date: 'DESC' },
			});
			expect(result).toBeNull();
		});

		it('should handle database errors', async () => {
			marketDataRepository.findOne.mockRejectedValue(
				new Error('Database error')
			);

			await expect(service.getLatestMarketData(1)).rejects.toThrow(
				'Database error'
			);
		});

		it('should order by date descending to get latest', async () => {
			const latestData = mockMarketData[1];
			marketDataRepository.findOne.mockResolvedValue(
				latestData as MarketData
			);

			await service.getLatestMarketData(1);

			expect(marketDataRepository.findOne).toHaveBeenCalledWith({
				where: { instrumentId: 1 },
				order: { date: 'DESC' },
			});
		});
	});
});
