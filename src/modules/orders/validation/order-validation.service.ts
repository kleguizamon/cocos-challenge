import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderSide, OrderStatus } from '../../../entities/order.entity';

/**
 * Validates orders and calculates available cash/shares for users.
 */

@Injectable()
export class OrderValidationService {
	private readonly logger = new Logger(OrderValidationService.name);

	constructor(
		@InjectRepository(Order)
		private orderRepository: Repository<Order>
	) {}

	async validateOrder(
		userId: number,
		instrumentId: number,
		side: OrderSide,
		size: number,
		price: number
	): Promise<{ isValid: boolean; reason?: string }> {
		if (side === OrderSide.CASH_IN || side === OrderSide.CASH_OUT) {
			if (side === OrderSide.CASH_OUT) {
				const availableCash = await this.calculateAvailableCash(userId);
				if (size * price > availableCash) {
					return { isValid: false, reason: 'Insufficient cash' };
				}
			}
			return { isValid: true };
		}

		if (side === OrderSide.BUY) {
			const availableCash = await this.calculateAvailableCash(userId);
			const totalCost = size * price;
			if (totalCost > availableCash) {
				return { isValid: false, reason: 'Insufficient cash' };
			}
		}

		if (side === OrderSide.SELL) {
			const availableShares = await this.calculateAvailableShares(
				userId,
				instrumentId
			);
			if (size > availableShares) {
				return { isValid: false, reason: 'Insufficient shares' };
			}
		}

		return { isValid: true };
	}

	/**
	 * Calculates available cash for a user based on filled orders.
	 */

	async calculateAvailableCash(userId: number): Promise<number> {
		this.logger.log(
			`[calculateAvailableCash] Starting for userId: ${userId}`
		);
		const orders = await this.getFilledOrdersByUser(userId);
		this.logger.log(
			`[calculateAvailableCash] Found ${orders.length} filled orders.`
		);

		let cash = 0;

		for (const order of orders) {
			cash += this.calculateOrderCashImpact(order);
			this.logCashUpdate(order, cash);
		}

		this.logger.log(
			`[calculateAvailableCash] Final cash for userId ${userId}: ${cash}`
		);
		return Math.max(0, cash);
	}

	/**
	 * Calculates available shares for a user and instrument.
	 */

	async calculateAvailableShares(
		userId: number,
		instrumentId: number
	): Promise<number> {
		const orders = await this.orderRepository.find({
			where: { userId, instrumentId, status: OrderStatus.FILLED },
		});

		let shares = 0;
		for (const order of orders) {
			if (order.side === OrderSide.BUY) {
				shares += order.size;
			} else if (order.side === OrderSide.SELL) {
				shares -= order.size;
			}
		}

		return Math.max(0, shares);
	}

	/**
	 * Calculates cash impact of an order on user's balance.
	 */

	private calculateOrderCashImpact(order: Order): number {
		const value = order.size * order.price;
		const isCurrencyOperation = order.instrument.type === 'MONEDA';

		if (isCurrencyOperation) {
			return order.side === OrderSide.CASH_IN ? value : -value;
		}

		return order.side === OrderSide.SELL ? value : -value;
	}

	private logCashUpdate(order: Order, currentCash: number): void {
		this.logger.log(
			`[calculateAvailableCash] Order ${order.id} (${order.side} ${order.instrument.ticker}), cash is now: ${currentCash}`
		);
	}

	/**
	 * This method is responsible for getting the filled orders of a user.
	 * It is used to get the filled orders of a user.
	 */

	private async getFilledOrdersByUser(userId: number): Promise<Order[]> {
		return this.orderRepository.find({
			where: { userId, status: OrderStatus.FILLED },
			relations: ['instrument'],
		});
	}
}
