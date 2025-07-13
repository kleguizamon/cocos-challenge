import { Test, TestingModule } from '@nestjs/testing';

import { PositionCalculatorService } from './position-calculator.service';
import { Order, OrderSide, OrderStatus } from '../../../entities/order.entity';

describe('PositionCalculatorService', () => {
	let service: PositionCalculatorService;

	const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
		id: 1,
		userId: 1,
		instrumentId: 1,
		side: OrderSide.BUY,
		type: 'MARKET' as any,
		size: 100,
		price: 150,
		status: OrderStatus.FILLED,
		datetime: new Date('2023-01-01'),
		user: null,
		instrument: {
			id: 1,
			ticker: 'AAPL',
			name: 'Apple Inc.',
			type: 'Stock',
			orders: [],
			marketData: [],
		},
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [PositionCalculatorService],
		}).compile();

		service = module.get<PositionCalculatorService>(
			PositionCalculatorService
		);
	});

	describe('calculatePositions', () => {
		it('should calculate positions from simple buy order', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(1);
			expect(result.get(1)).toEqual({
				quantity: 100,
				avgPrice: 150,
				totalCost: 15000,
			});
		});

		it('should calculate average price for multiple buy orders', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
					datetime: new Date('2023-01-01'),
				}),
				createMockOrder({
					id: 2,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 200,
					price: 160,
					datetime: new Date('2023-01-02'),
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(1);
			const position = result.get(1);
			expect(position.quantity).toBe(300);
			// Average price: (100*150 + 200*160) / 300 = (15000 + 32000) / 300 = 156.67
			expect(position.avgPrice).toBeCloseTo(156.67, 2);
			expect(position.totalCost).toBe(47000);
		});

		it('should handle sell orders reducing position', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
					datetime: new Date('2023-01-01'),
				}),
				createMockOrder({
					id: 2,
					instrumentId: 1,
					side: OrderSide.SELL,
					size: 30,
					price: 160,
					datetime: new Date('2023-01-02'),
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(1);
			const position = result.get(1);
			expect(position.quantity).toBe(70);
			expect(position.avgPrice).toBe(150); // Avg price doesn't change on sell
			expect(position.totalCost).toBe(150 * 70); // Recalculated based on remaining quantity
		});

		it('should close position when selling all shares', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
					datetime: new Date('2023-01-01'),
				}),
				createMockOrder({
					id: 2,
					instrumentId: 1,
					side: OrderSide.SELL,
					size: 100,
					price: 160,
					datetime: new Date('2023-01-02'),
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(0);
			expect(result.get(1)).toBeUndefined();
		});

		it('should close position when selling more than owned', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
					datetime: new Date('2023-01-01'),
				}),
				createMockOrder({
					id: 2,
					instrumentId: 1,
					side: OrderSide.SELL,
					size: 150, // Selling more than owned
					price: 160,
					datetime: new Date('2023-01-02'),
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(0);
			expect(result.get(1)).toBeUndefined();
		});

		it('should handle multiple instruments separately', () => {
			const orders = [
				createMockOrder({
					id: 1,
					instrumentId: 1,
					side: OrderSide.BUY,
					size: 100,
					price: 150,
					instrument: {
						id: 1,
						ticker: 'AAPL',
						name: 'Apple Inc.',
						type: 'Stock',
						orders: [],
						marketData: [],
					},
				}),
				createMockOrder({
					id: 2,
					instrumentId: 2,
					side: OrderSide.BUY,
					size: 200,
					price: 250,
					instrument: {
						id: 2,
						ticker: 'MSFT',
						name: 'Microsoft Corp.',
						type: 'Stock',
						orders: [],
						marketData: [],
					},
				}),
			];

			const result = service.calculatePositions(orders);

			expect(result.size).toBe(2);
			expect(result.get(1)).toEqual({
				quantity: 100,
				avgPrice: 150,
				totalCost: 15000,
			});
			expect(result.get(2)).toEqual({
				quantity: 200,
				avgPrice: 250,
				totalCost: 50000,
			});
		});
	});
});
