import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { InstrumentsService } from './instruments.service';
import { Instrument } from '../../entities/instrument.entity';

describe('InstrumentsService', () => {
	let service: InstrumentsService;
	let instrumentRepository: jest.Mocked<Repository<Instrument>>;

	const mockInstruments: Instrument[] = [
		{
			id: 1,
			ticker: 'AAPL',
			name: 'Apple Inc.',
			type: 'Stock',
			orders: [],
			marketData: [],
		},
		{
			id: 2,
			ticker: 'MSFT',
			name: 'Microsoft Corporation',
			type: 'Stock',
			orders: [],
			marketData: [],
		},
		{
			id: 3,
			ticker: 'SPY',
			name: 'SPDR S&P 500 ETF Trust',
			type: 'ETF',
			orders: [],
			marketData: [],
		},
		{
			id: 66,
			ticker: 'ARS',
			name: 'Peso Argentino',
			type: 'MONEDA',
			orders: [],
			marketData: [],
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				InstrumentsService,
				{
					provide: getRepositoryToken(Instrument),
					useValue: {
						findOne: jest.fn(),
						find: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<InstrumentsService>(InstrumentsService);
		instrumentRepository = module.get(getRepositoryToken(Instrument));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('findOne', () => {
		it('should return an instrument by id', async () => {
			const expectedInstrument = mockInstruments[0];
			instrumentRepository.findOne.mockResolvedValue(expectedInstrument);

			const result = await service.findOne(1);

			expect(instrumentRepository.findOne).toHaveBeenCalledWith({
				where: { id: 1 },
			});
			expect(result).toEqual(expectedInstrument);
		});

		it('should return null when instrument not found', async () => {
			instrumentRepository.findOne.mockResolvedValue(null);

			const result = await service.findOne(999);

			expect(instrumentRepository.findOne).toHaveBeenCalledWith({
				where: { id: 999 },
			});
			expect(result).toBeNull();
		});

		it('should handle database errors', async () => {
			instrumentRepository.findOne.mockRejectedValue(
				new Error('Database error')
			);

			await expect(service.findOne(1)).rejects.toThrow('Database error');
		});
	});

	describe('findAll', () => {
		it('should return all instruments', async () => {
			instrumentRepository.find.mockResolvedValue(mockInstruments);

			const result = await service.findAll();

			expect(instrumentRepository.find).toHaveBeenCalledWith();
			expect(result).toEqual(mockInstruments);
			expect(result).toHaveLength(4);
		});

		it('should return empty array when no instruments exist', async () => {
			instrumentRepository.find.mockResolvedValue([]);

			const result = await service.findAll();

			expect(result).toEqual([]);
		});

		it('should handle database errors', async () => {
			instrumentRepository.find.mockRejectedValue(
				new Error('Database error')
			);

			await expect(service.findAll()).rejects.toThrow('Database error');
		});
	});

	describe('search', () => {
		it('should return all instruments when query is empty', async () => {
			instrumentRepository.find.mockResolvedValue(mockInstruments);

			const result = await service.search('');

			expect(instrumentRepository.find).toHaveBeenCalledWith();
			expect(result).toEqual(mockInstruments);
		});

		it('should search by ticker (case insensitive)', async () => {
			const appleResults = [mockInstruments[0]];
			instrumentRepository.find.mockResolvedValue(appleResults);

			const result = await service.search('aapl');

			expect(instrumentRepository.find).toHaveBeenCalledWith({
				where: [{ ticker: Like('%AAPL%') }, { name: Like('%aapl%') }],
			});
			expect(result).toEqual(appleResults);
		});

		it('should search by partial ticker match', async () => {
			const microsoftResults = [mockInstruments[1]];
			instrumentRepository.find.mockResolvedValue(microsoftResults);

			const result = await service.search('msf');

			expect(instrumentRepository.find).toHaveBeenCalledWith({
				where: [{ ticker: Like('%MSF%') }, { name: Like('%msf%') }],
			});
			expect(result).toEqual(microsoftResults);
		});

		it('should search by partial name match', async () => {
			const microsoftResults = [mockInstruments[1]];
			instrumentRepository.find.mockResolvedValue(microsoftResults);

			const result = await service.search('microsoft');

			expect(instrumentRepository.find).toHaveBeenCalledWith({
				where: [
					{ ticker: Like('%MICROSOFT%') },
					{ name: Like('%microsoft%') },
				],
			});
			expect(result).toEqual(microsoftResults);
		});

		it('should handle multiple results', async () => {
			const multipleResults = [mockInstruments[0], mockInstruments[1]];
			instrumentRepository.find.mockResolvedValue(multipleResults);

			const result = await service.search('corp');

			expect(result).toEqual(multipleResults);
			expect(result).toHaveLength(2);
		});

		it('should handle numeric search queries', async () => {
			instrumentRepository.find.mockResolvedValue([]);

			const result = await service.search('500');

			expect(instrumentRepository.find).toHaveBeenCalledWith({
				where: [{ ticker: Like('%500%') }, { name: Like('%500%') }],
			});
		});
	});
});
