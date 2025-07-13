import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { OrderPricingService } from './order-pricing.service';
import { OrderType, OrderSide } from '../../../entities/order.entity';
import { MarketdataService } from '../../marketdata/marketdata.service';
import { MarketData } from '../../../entities';

describe('OrderPricingService', () => {
	let service: OrderPricingService;
	let marketdataService: jest.Mocked<MarketdataService>;

	const mockMarketData = {
		id: 1,
		instrumentId: 1,
		open: 148.5,
		high: 152.3,
		low: 147.8,
		close: 150.0,
		previousClose: 149.2,
		date: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrderPricingService,
				{
					provide: MarketdataService,
					useValue: {
						getLatestMarketData: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<OrderPricingService>(OrderPricingService);
		marketdataService = module.get(MarketdataService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('calculateOrderPrice', () => {
		describe('Cash operations', () => {
			it('should return price 1 for CASH_IN operations', async () => {
				const result = await service.calculateOrderPrice(
					OrderSide.CASH_IN,
					OrderType.MARKET,
					66
				);

				expect(result).toBe(1);
				expect(
					marketdataService.getLatestMarketData
				).not.toHaveBeenCalled();
			});

			it('should return price 1 for CASH_OUT operations', async () => {
				const result = await service.calculateOrderPrice(
					OrderSide.CASH_OUT,
					OrderType.MARKET,
					66
				);

				expect(result).toBe(1);
				expect(
					marketdataService.getLatestMarketData
				).not.toHaveBeenCalled();
			});
		});

		describe('Market orders', () => {
			it('should return market close price for MARKET orders', async () => {
				marketdataService.getLatestMarketData.mockResolvedValue(
					mockMarketData as MarketData
				);

				const result = await service.calculateOrderPrice(
					OrderSide.BUY,
					OrderType.MARKET,
					1
				);

				expect(marketdataService.getLatestMarketData).toHaveBeenCalledWith(
					1
				);
				expect(result).toBe(150.0);
			});

			it('should throw BadRequestException when market data not available', async () => {
				marketdataService.getLatestMarketData.mockResolvedValue(null);

				await expect(
					service.calculateOrderPrice(OrderSide.BUY, OrderType.MARKET, 999)
				).rejects.toThrow(BadRequestException);

				expect(marketdataService.getLatestMarketData).toHaveBeenCalledWith(
					999
				);
			});
		});

		describe('Limit orders', () => {
			it('should return provided price for LIMIT orders', async () => {
				const providedPrice = 145.5;

				const result = await service.calculateOrderPrice(
					OrderSide.BUY,
					OrderType.LIMIT,
					1,
					providedPrice
				);

				expect(result).toBe(providedPrice);
				expect(
					marketdataService.getLatestMarketData
				).not.toHaveBeenCalled();
			});

			it('should throw BadRequestException when price not provided for LIMIT orders', async () => {
				await expect(
					service.calculateOrderPrice(OrderSide.BUY, OrderType.LIMIT, 1)
				).rejects.toThrow(BadRequestException);

				expect(
					marketdataService.getLatestMarketData
				).not.toHaveBeenCalled();
			});

			it('should throw BadRequestException when price is undefined for LIMIT orders', async () => {
				await expect(
					service.calculateOrderPrice(
						OrderSide.BUY,
						OrderType.LIMIT,
						1,
						undefined
					)
				).rejects.toThrow(BadRequestException);
			});
		});

		describe('Edge cases', () => {
			it('should handle SELL MARKET orders correctly', async () => {
				marketdataService.getLatestMarketData.mockResolvedValue(
					mockMarketData as MarketData
				);

				const result = await service.calculateOrderPrice(
					OrderSide.SELL,
					OrderType.MARKET,
					1
				);

				expect(result).toBe(150.0);
			});

			it('should handle SELL LIMIT orders correctly', async () => {
				const providedPrice = 155.0;

				const result = await service.calculateOrderPrice(
					OrderSide.SELL,
					OrderType.LIMIT,
					1,
					providedPrice
				);

				expect(result).toBe(providedPrice);
			});
		});
	});

	describe('calculateOrderSize', () => {
		it('should calculate order size correctly with valid inputs', () => {
			const amount = 15000;
			const price = 150.0;

			const result = service.calculateOrderSize(amount, price);

			//Math.floor(15000 / 150) = 100
			expect(result).toBe(100);
		});

		it('should use Math.floor for fractional results', () => {
			const amount = 15050;
			const price = 150.0;

			const result = service.calculateOrderSize(amount, price);

			// Math.floor(15050 / 150) = Math.floor(100.33) = 100
			expect(result).toBe(100);
		});

		it('should throw BadRequestException when price is zero', () => {
			expect(() => service.calculateOrderSize(1000, 0)).toThrow(
				BadRequestException
			);
		});

		it('should throw BadRequestException when price is null', () => {
			expect(() => service.calculateOrderSize(1000, null)).toThrow(
				BadRequestException
			);
		});

		it('should throw BadRequestException when price is undefined', () => {
			expect(() => service.calculateOrderSize(1000, undefined)).toThrow(
				BadRequestException
			);
		});

		it('should throw BadRequestException when calculated size is zero', () => {
			const amount = 100;
			const price = 1000;

			expect(() => service.calculateOrderSize(amount, price)).toThrow(
				BadRequestException
			);
		});

		it('should throw BadRequestException when calculated size is negative', () => {
			const amount = -1000; // Negative amount
			const price = 150;

			expect(() => service.calculateOrderSize(amount, price)).toThrow(
				BadRequestException
			);
		});

		it('should handle edge case where amount equals price', () => {
			const amount = 150;
			const price = 150;

			const result = service.calculateOrderSize(amount, price);

			// Math.floor(150 / 150) = 1
			expect(result).toBe(1);
		});

		it('should handle large amounts correctly', () => {
			const amount = 1000000;
			const price = 100;

			const result = service.calculateOrderSize(amount, price);

			// Math.floor(1000000 / 100) = 10000
			expect(result).toBe(10000);
		});

		it('should handle decimal prices correctly', () => {
			const amount = 15050.75;
			const price = 150.25;

			const result = service.calculateOrderSize(amount, price);

			// Math.floor(15050.75 / 150.25) = Math.floor(100.17) = 100
			expect(result).toBe(100);
		});
	});
});
