import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OrderValidationService } from '../validation/order-validation.service';
import { Order, OrderSide, OrderStatus } from '../../../entities/order.entity';

describe('OrderValidationService', () => {
	let service: OrderValidationService;
	let orderRepository: jest.Mocked<Repository<Order>>;

	const mockFilledOrders = [
		{
			id: 1,
			userId: 1,
			instrumentId: 66,
			side: OrderSide.CASH_IN,
			size: 100000,
			price: 1,
			status: OrderStatus.FILLED,
			instrument: {
				id: 66,
				ticker: 'ARS',
				name: 'Peso Argentino',
				type: 'MONEDA',
			},
		},
		{
			id: 2,
			userId: 1,
			instrumentId: 1,
			side: OrderSide.BUY,
			size: 100,
			price: 150,
			status: OrderStatus.FILLED,
			instrument: {
				id: 1,
				ticker: 'AAPL',
				name: 'Apple Inc.',
				type: 'Stock',
			},
		},
		{
			id: 3,
			userId: 1,
			instrumentId: 1,
			side: OrderSide.SELL,
			size: 50,
			price: 160,
			status: OrderStatus.FILLED,
			instrument: {
				id: 1,
				ticker: 'AAPL',
				name: 'Apple Inc.',
				type: 'Stock',
			},
		},
	];

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrderValidationService,
				{
					provide: getRepositoryToken(Order),
					useValue: {
						find: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<OrderValidationService>(OrderValidationService);
		orderRepository = module.get(getRepositoryToken(Order));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('validateOrder', () => {
		beforeEach(() => {
			orderRepository.find.mockResolvedValue(mockFilledOrders as Order[]);
		});

		describe('CASH_IN operations', () => {
			it('should always validate CASH_IN orders', async () => {
				const result = await service.validateOrder(
					1,
					66,
					OrderSide.CASH_IN,
					10000,
					1
				);

				expect(result).toEqual({ isValid: true });
			});
		});

		describe('CASH_OUT operations', () => {
			it('should validate CASH_OUT when sufficient cash available', async () => {
				// Available cash = 100000 (cash_in) - 15000 (buy) + 8000 (sell) = 93000
				const result = await service.validateOrder(
					1,
					66,
					OrderSide.CASH_OUT,
					50000,
					1
				);

				expect(result).toEqual({ isValid: true });
			});

			it('should reject CASH_OUT when insufficient cash', async () => {
				const result = await service.validateOrder(
					1,
					66,
					OrderSide.CASH_OUT,
					100000,
					1
				);

				expect(result).toEqual({
					isValid: false,
					reason: 'Insufficient cash',
				});
			});
		});

		describe('BUY operations', () => {
			it('should validate BUY order when sufficient cash available', async () => {
				// Available cash = 93000, order cost = 100 * 150 = 15000
				const result = await service.validateOrder(
					1,
					2,
					OrderSide.BUY,
					100,
					150
				);

				expect(result).toEqual({ isValid: true });
			});

			it('should reject BUY order when insufficient cash', async () => {
				// Available cash = 93000, order cost = 1000 * 150 = 150000
				const result = await service.validateOrder(
					1,
					2,
					OrderSide.BUY,
					1000,
					150
				);

				expect(result).toEqual({
					isValid: false,
					reason: 'Insufficient cash',
				});
			});
		});

		describe('SELL operations', () => {
			it('should validate SELL order when sufficient shares available', async () => {
				// Available shares for instrument 1 = 100 (buy) - 50 (sell) = 50
				orderRepository.find
					.mockResolvedValueOnce(mockFilledOrders as Order[]) // For cash calculation
					.mockResolvedValueOnce([
						mockFilledOrders[1], // BUY 100 shares
						mockFilledOrders[2], // SELL 50 shares
					] as Order[]); // For share calculation

				const result = await service.validateOrder(
					1,
					1,
					OrderSide.SELL,
					25,
					160
				);

				expect(result).toEqual({ isValid: true });
			});

			it('should reject SELL order when insufficient shares', async () => {
				orderRepository.find
					.mockResolvedValueOnce(mockFilledOrders as Order[]) // For cash calculation
					.mockResolvedValueOnce([
						mockFilledOrders[1], // BUY 100 shares
						mockFilledOrders[2], // SELL 50 shares
					] as Order[]); // For share calculation

				const result = await service.validateOrder(
					1,
					1,
					OrderSide.SELL,
					100, // Trying to sell 100 but only have 50
					160
				);

				expect(result).toEqual({
					isValid: false,
					reason: 'Insufficient shares',
				});
			});
		});
	});

	describe('calculateAvailableCash', () => {
		it('should calculate cash correctly with mixed operations', async () => {
			orderRepository.find.mockResolvedValue(mockFilledOrders as Order[]);

			const result = await service.calculateAvailableCash(1);

			// Expected calculation:
			// CASH_IN: +100000 (100000 * 1)
			// BUY: -15000 (100 * 150)
			// SELL: +8000 (50 * 160)
			// Total: 100000 - 15000 + 8000 = 93000
			expect(result).toBe(93000);
		});

		it('should return 0 when calculated cash is negative', async () => {
			const negativeOrders = [
				{
					...mockFilledOrders[0],
					size: 1000, // Small cash in
				},
				{
					...mockFilledOrders[1],
					size: 1000, // Large buy
					price: 100,
				},
			];
			orderRepository.find.mockResolvedValue(negativeOrders as Order[]);

			const result = await service.calculateAvailableCash(1);

			// Expected: 1000 - 100000 = -99000 → 0 (Math.max)
			expect(result).toBe(0);
		});

		it('should handle user with no orders', async () => {
			orderRepository.find.mockResolvedValue([]);

			const result = await service.calculateAvailableCash(1);

			expect(result).toBe(0);
		});

		it('should correctly separate MONEDA and non-MONEDA instruments', async () => {
			const mixedOrders = [
				// CASH operations (MONEDA)
				{
					id: 1,
					side: OrderSide.CASH_IN,
					size: 50000,
					price: 1,
					instrument: { type: 'MONEDA' },
				},
				{
					id: 2,
					side: OrderSide.CASH_OUT,
					size: 10000,
					price: 1,
					instrument: { type: 'MONEDA' },
				},
				// Trading operations (Stock)
				{
					id: 3,
					side: OrderSide.BUY,
					size: 100,
					price: 200,
					instrument: { type: 'Stock' },
				},
				{
					id: 4,
					side: OrderSide.SELL,
					size: 50,
					price: 220,
					instrument: { type: 'Stock' },
				},
			];

			orderRepository.find.mockResolvedValue(mixedOrders as Order[]);

			const result = await service.calculateAvailableCash(1);

			// Expected calculation:
			// CASH_IN: +50000
			// CASH_OUT: -10000
			// BUY: -20000 (100 * 200)
			// SELL: +11000 (50 * 220)
			// Total: 50000 - 10000 - 20000 + 11000 = 31000
			expect(result).toBe(31000);
		});
	});
});
