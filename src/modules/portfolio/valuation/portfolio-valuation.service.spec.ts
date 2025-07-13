import { Test, TestingModule } from '@nestjs/testing';

import { PortfolioValuationService } from './portfolio-valuation.service';
import { PositionDto } from '../../../dtos/portfolio-response.dto';
import { MarketData } from '../../../entities/marketdata.entity';
import { Instrument } from '../../../entities/instrument.entity';
import { Position } from '../calculator/position-calculator.service';

describe('PortfolioValuationService', () => {
	let service: PortfolioValuationService;

	const mockPosition: Position = {
		quantity: 100,
		avgPrice: 150,
		totalCost: 15000,
	};

	const mockMarketData: Partial<MarketData> = {
		id: 1,
		instrumentId: 1,
		open: 148.5,
		high: 152.3,
		low: 147.8,
		close: 160.0,
		previousClose: 155.0,
		date: new Date(),
	};

	const mockInstrument: Partial<Instrument> = {
		id: 1,
		ticker: 'AAPL',
		name: 'Apple Inc.',
		type: 'Stock',
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [PortfolioValuationService],
		}).compile();

		service = module.get<PortfolioValuationService>(
			PortfolioValuationService
		);
	});

	describe('calculatePositionMetrics', () => {
		it('should calculate position metrics correctly', () => {
			const result = service.calculatePositionMetrics(
				mockPosition,
				mockMarketData as MarketData as MarketData
			);

			expect(result.currentValue).toBe(16000); // 100 shares * 160 price
			expect(result.dailyReturn).toBeCloseTo(3.23, 2); // ((160-155)/155)*100 = 3.23%
			expect(result.totalReturn).toBeCloseTo(6.67, 2); // ((160-150)/150)*100 = 6.67%
		});

		it('should handle zero previous close correctly', () => {
			const marketDataWithZeroPrevClose = {
				...(mockMarketData as MarketData),
				previousClose: 0,
			};

			const result = service.calculatePositionMetrics(
				mockPosition,
				marketDataWithZeroPrevClose
			);

			expect(result.currentValue).toBe(16000);
			expect(result.dailyReturn).toBe(Infinity); // Division by zero
			expect(result.totalReturn).toBeCloseTo(6.67, 2);
		});

		it('should handle zero average price correctly', () => {
			const positionWithZeroAvg = {
				...mockPosition,
				avgPrice: 0,
			};

			const result = service.calculatePositionMetrics(
				positionWithZeroAvg,
				mockMarketData as MarketData
			);

			expect(result.currentValue).toBe(16000);
			expect(result.dailyReturn).toBeCloseTo(3.23, 2);
			expect(result.totalReturn).toBe(Infinity); // Division by zero
		});

		it('should handle negative returns correctly', () => {
			const bearishMarketData = {
				...(mockMarketData as MarketData),
				close: 140.0, // Lower than both previous close and avg price
				previousClose: 145.0,
			};

			const result = service.calculatePositionMetrics(
				mockPosition,
				bearishMarketData
			);

			expect(result.currentValue).toBe(14000); // 100 * 140
			expect(result.dailyReturn).toBeCloseTo(-3.45, 2); // ((140-145)/145)*100 = -3.45%
			expect(result.totalReturn).toBeCloseTo(-6.67, 2); // ((140-150)/150)*100 = -6.67%
		});

		it('should handle fractional shares correctly', () => {
			const fractionalPosition = {
				quantity: 75.5,
				avgPrice: 150.25,
				totalCost: 11343.875,
			};

			const result = service.calculatePositionMetrics(
				fractionalPosition,
				mockMarketData as MarketData
			);

			expect(result.currentValue).toBe(12080); // 75.5 * 160
			expect(result.dailyReturn).toBeCloseTo(3.23, 2);
			expect(result.totalReturn).toBeCloseTo(6.49, 2); // ((160-150.25)/150.25)*100
		});
	});

	describe('createPositionDto', () => {
		const mockMetrics = {
			currentValue: 16000,
			dailyReturn: 3.23,
			totalReturn: 6.67,
		};

		it('should create position DTO correctly', () => {
			const result = service.createPositionDto(
				1,
				mockInstrument as Instrument,
				mockPosition,
				mockMetrics
			);

			expect(result).toEqual({
				instrumentId: 1,
				ticker: 'AAPL',
				name: 'Apple Inc.',
				quantity: 100,
				totalValue: 16000,
				dailyReturn: 3.23,
				totalReturn: 6.67,
				avgPrice: 150,
			});
		});

		it('should handle different instrument types', () => {
			const etfInstrument: Partial<Instrument> = {
				id: 2,
				ticker: 'SPY',
				name: 'SPDR S&P 500 ETF',
				type: 'ETF',
			};

			const result = service.createPositionDto(
				2,
				etfInstrument as Instrument,
				mockPosition,
				mockMetrics
			);

			expect(result.instrumentId).toBe(2);
			expect(result.ticker).toBe('SPY');
			expect(result.name).toBe('SPDR S&P 500 ETF');
		});
	});

	describe('calculatePortfolioDailyReturn', () => {
		const mockPositions: PositionDto[] = [
			{
				instrumentId: 1,
				ticker: 'AAPL',
				name: 'Apple Inc.',
				quantity: 100,
				totalValue: 16000,
				dailyReturn: 5.0, // 5% daily return
				totalReturn: 10.0,
				avgPrice: 150,
			},
			{
				instrumentId: 2,
				ticker: 'MSFT',
				name: 'Microsoft Corp.',
				quantity: 50,
				totalValue: 8000,
				dailyReturn: 2.0, // 2% daily return
				totalReturn: 15.0,
				avgPrice: 160,
			},
			{
				instrumentId: 3,
				ticker: 'GOOGL',
				name: 'Alphabet Inc.',
				quantity: 20,
				totalValue: 6000,
				dailyReturn: -1.0, // -1% daily return
				totalReturn: 8.0,
				avgPrice: 300,
			},
		];

		it('should calculate portfolio weighted return correctly', () => {
			const totalValue = 30000; // 16000 + 8000 + 6000

			const result = service.calculatePortfolioDailyReturn(
				mockPositions,
				totalValue
			);

			// Expected calculation:
			// AAPL weight: 16000/30000 = 0.5333, contribution: 0.5333 * 5% = 2.667%
			// MSFT weight: 8000/30000 = 0.2667, contribution: 0.2667 * 2% = 0.533%
			// GOOGL weight: 6000/30000 = 0.2, contribution: 0.2 * (-1%) = -0.2%
			// Total: 2.667 + 0.533 - 0.2 = 3%
			expect(result).toBeCloseTo(3.0, 2);
		});
	});
});
