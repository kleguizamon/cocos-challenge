import { Test, TestingModule } from '@nestjs/testing';

import { PortfolioService } from './portfolio.service';
import { OrdersService } from '../orders/orders.service';
import { MarketdataService } from '../marketdata/marketdata.service';
import { InstrumentsService } from '../instruments/instruments.service';
import {
	PositionCalculatorService,
	Position,
} from './calculator/position-calculator.service';
import { PortfolioValuationService } from './valuation/portfolio-valuation.service';
import {
	PortfolioResponseDto,
	PositionDto,
} from '../../dtos/portfolio-response.dto';
import { Order, OrderSide, OrderStatus } from '../../entities/order.entity';
import { MarketData } from '../../entities/marketdata.entity';
import { Instrument } from '../../entities/instrument.entity';

describe('PortfolioService', () => {
	let service: PortfolioService;
	let ordersService: jest.Mocked<OrdersService>;
	let marketdataService: jest.Mocked<MarketdataService>;
	let instrumentsService: jest.Mocked<InstrumentsService>;
	let positionCalculatorService: jest.Mocked<PositionCalculatorService>;
	let portfolioValuationService: jest.Mocked<PortfolioValuationService>;

	const mockInstruments: Partial<Instrument>[] = [
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
			name: 'Microsoft Corp.',
			type: 'Stock',
			orders: [],
			marketData: [],
		},
	];

	const mockMarketData: MarketData[] = [
		{
			id: 1,
			instrumentId: 1,
			open: 148.5,
			high: 152.3,
			low: 147.8,
			close: 160.0,
			previousClose: 155.0,
			date: new Date(),
			instrument: mockInstruments[0] as Instrument,
		},
		{
			id: 2,
			instrumentId: 2,
			open: 248.0,
			high: 252.0,
			low: 246.0,
			close: 260.0,
			previousClose: 255.0,
			date: new Date(),
			instrument: mockInstruments[1] as Instrument,
		},
	];

	const mockOrders: Order[] = [
		{
			id: 1,
			userId: 1,
			instrumentId: 1,
			side: OrderSide.BUY,
			type: 'MARKET' as any,
			size: 100,
			price: 150,
			status: OrderStatus.FILLED,
			datetime: new Date('2023-01-01'),
			instrument: mockInstruments[0] as Instrument,
			user: null,
		},
		{
			id: 2,
			userId: 1,
			instrumentId: 2,
			side: OrderSide.BUY,
			type: 'MARKET' as any,
			size: 50,
			price: 250,
			status: OrderStatus.FILLED,
			datetime: new Date('2023-01-02'),
			instrument: mockInstruments[1] as Instrument,
			user: null,
		},
	];

	const mockPositions = new Map<number, Position>([
		[1, { quantity: 100, avgPrice: 150, totalCost: 15000 }],
		[2, { quantity: 50, avgPrice: 250, totalCost: 12500 }],
	]);

	const mockPositionDtos: PositionDto[] = [
		{
			instrumentId: 1,
			ticker: 'AAPL',
			name: 'Apple Inc.',
			quantity: 100,
			totalValue: 16000,
			dailyReturn: 3.23,
			totalReturn: 6.67,
			avgPrice: 150,
		},
		{
			instrumentId: 2,
			ticker: 'MSFT',
			name: 'Microsoft Corp.',
			quantity: 50,
			totalValue: 13000,
			dailyReturn: 1.96,
			totalReturn: 4.0,
			avgPrice: 250,
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PortfolioService,
				{
					provide: OrdersService,
					useValue: {
						getFilledOrdersByUser: jest.fn(),
						calculateAvailableCash: jest.fn(),
					},
				},
				{
					provide: MarketdataService,
					useValue: {
						getMarketDataByInstruments: jest.fn(),
					},
				},
				{
					provide: InstrumentsService,
					useValue: {
						findOne: jest.fn(),
					},
				},
				{
					provide: PositionCalculatorService,
					useValue: {
						calculatePositions: jest.fn(),
					},
				},
				{
					provide: PortfolioValuationService,
					useValue: {
						calculatePositionMetrics: jest.fn(),
						createPositionDto: jest.fn(),
						calculatePortfolioDailyReturn: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PortfolioService>(PortfolioService);
		ordersService = module.get(OrdersService);
		marketdataService = module.get(MarketdataService);
		instrumentsService = module.get(InstrumentsService);
		positionCalculatorService = module.get(PositionCalculatorService);
		portfolioValuationService = module.get(PortfolioValuationService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getPortfolio', () => {
		beforeEach(() => {
			// Setup default mocks
			ordersService.getFilledOrdersByUser.mockResolvedValue(mockOrders);
			ordersService.calculateAvailableCash.mockResolvedValue(25000);
			positionCalculatorService.calculatePositions.mockReturnValue(
				mockPositions
			);
			marketdataService.getMarketDataByInstruments.mockResolvedValue(
				mockMarketData as MarketData[]
			);
			instrumentsService.findOne
				.mockResolvedValueOnce(mockInstruments[0] as Instrument)
				.mockResolvedValueOnce(mockInstruments[1] as Instrument);

			portfolioValuationService.calculatePositionMetrics
				.mockReturnValueOnce({
					currentValue: 16000,
					dailyReturn: 3.23,
					totalReturn: 6.67,
				})
				.mockReturnValueOnce({
					currentValue: 13000,
					dailyReturn: 1.96,
					totalReturn: 4.0,
				});

			portfolioValuationService.createPositionDto
				.mockReturnValueOnce(mockPositionDtos[0])
				.mockReturnValueOnce(mockPositionDtos[1]);

			portfolioValuationService.calculatePortfolioDailyReturn.mockReturnValue(
				2.8
			);
		});

		it('should return complete portfolio with all positions', async () => {
			const result = await service.getPortfolio(1);

			const expectedResponse: PortfolioResponseDto = {
				totalValue: 54000, // 25000 cash + 16000 AAPL + 13000 MSFT
				availableCash: 25000,
				dailyReturn: 2.8,
				positions: mockPositionDtos,
			};

			expect(result).toEqual(expectedResponse);
		});

		it('should fetch orders and cash in parallel', async () => {
			await service.getPortfolio(1);

			expect(ordersService.getFilledOrdersByUser).toHaveBeenCalledWith(1);
			expect(ordersService.calculateAvailableCash).toHaveBeenCalledWith(1);
		});

		it('should calculate positions from orders', async () => {
			await service.getPortfolio(1);

			expect(
				positionCalculatorService.calculatePositions
			).toHaveBeenCalledWith(mockOrders);
		});

		it('should fetch market data for all position instruments', async () => {
			await service.getPortfolio(1);

			expect(
				marketdataService.getMarketDataByInstruments
			).toHaveBeenCalledWith([1, 2]);
		});

		it('should fetch instrument details for each position', async () => {
			await service.getPortfolio(1);

			expect(instrumentsService.findOne).toHaveBeenCalledWith(1);
			expect(instrumentsService.findOne).toHaveBeenCalledWith(2);
			expect(instrumentsService.findOne).toHaveBeenCalledTimes(2);
		});

		it('should calculate position metrics for each position', async () => {
			await service.getPortfolio(1);

			expect(
				portfolioValuationService.calculatePositionMetrics
			).toHaveBeenCalledWith(
				mockPositions.get(1),
				mockMarketData[0] as MarketData
			);
			expect(
				portfolioValuationService.calculatePositionMetrics
			).toHaveBeenCalledWith(
				mockPositions.get(2),
				mockMarketData[1] as MarketData
			);
		});

		it('should create position DTOs for each position', async () => {
			await service.getPortfolio(1);

			expect(
				portfolioValuationService.createPositionDto
			).toHaveBeenCalledWith(
				1,
				mockInstruments[0] as Instrument,
				mockPositions.get(1),
				{
					currentValue: 16000,
					dailyReturn: 3.23,
					totalReturn: 6.67,
				}
			);
			expect(
				portfolioValuationService.createPositionDto
			).toHaveBeenCalledWith(
				2,
				mockInstruments[1] as Instrument,
				mockPositions.get(2),
				{
					currentValue: 13000,
					dailyReturn: 1.96,
					totalReturn: 4.0,
				}
			);
		});

		it('should calculate portfolio daily return', async () => {
			await service.getPortfolio(1);

			expect(
				portfolioValuationService.calculatePortfolioDailyReturn
			).toHaveBeenCalledWith(
				mockPositionDtos,
				54000 // Total portfolio value
			);
		});

		it('should handle user with no positions (cash only)', async () => {
			positionCalculatorService.calculatePositions.mockReturnValue(
				new Map()
			);
			marketdataService.getMarketDataByInstruments.mockResolvedValue([]);
			portfolioValuationService.calculatePortfolioDailyReturn.mockReturnValue(
				0
			);

			const result = await service.getPortfolio(1);

			expect(result).toEqual({
				totalValue: 25000, // Only cash
				availableCash: 25000,
				dailyReturn: 0,
				positions: [],
			});
		});

		it('should handle user with no cash but with positions', async () => {
			ordersService.calculateAvailableCash.mockResolvedValue(0);

			const result = await service.getPortfolio(1);

			expect(result.totalValue).toBe(29000); // 0 cash + 16000 + 13000
			expect(result.availableCash).toBe(0);
			expect(result.positions).toHaveLength(2);
		});

		it('should skip positions with missing market data', async () => {
			const partialMarketData = [mockMarketData[0]]; // Only data for instrument 1
			marketdataService.getMarketDataByInstruments.mockResolvedValue(
				partialMarketData
			);

			portfolioValuationService.createPositionDto.mockReturnValueOnce(
				mockPositionDtos[0]
			);

			const result = await service.getPortfolio(1);

			expect(result.positions).toHaveLength(1);
			expect(result.positions[0]).toEqual(mockPositionDtos[0]);
			expect(
				portfolioValuationService.calculatePositionMetrics
			).toHaveBeenCalledTimes(1);
		});

		it('should handle service errors gracefully', async () => {
			ordersService.getFilledOrdersByUser.mockRejectedValue(
				new Error('Orders service error')
			);

			await expect(service.getPortfolio(1)).rejects.toThrow(
				'Orders service error'
			);
		});

		it('should handle market data service errors', async () => {
			marketdataService.getMarketDataByInstruments.mockRejectedValue(
				new Error('Market data service error')
			);

			await expect(service.getPortfolio(1)).rejects.toThrow(
				'Market data service error'
			);
		});

		it('should handle position calculator errors', async () => {
			positionCalculatorService.calculatePositions.mockImplementation(() => {
				throw new Error('Position calculator error');
			});

			await expect(service.getPortfolio(1)).rejects.toThrow(
				'Position calculator error'
			);
		});
	});
});
