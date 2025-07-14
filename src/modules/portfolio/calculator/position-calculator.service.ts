import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderSide } from '../../../entities/order.entity';

export interface Position {
	quantity: number;
	avgPrice: number;
	totalCost: number;
}

/**
 * Calculates user positions using weighted average cost method.
 */

@Injectable()
export class PositionCalculatorService {
	private readonly logger = new Logger(PositionCalculatorService.name);

	calculatePositions(filledOrders: Order[]): Map<number, Position> {
		const positions = new Map<number, Position>();

		const sortedOrders = filledOrders.sort(
			(a, b) =>
				new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
		);

		for (const order of sortedOrders) {
			if (order.instrument.type === 'MONEDA') {
				continue;
			}

			const instrumentId = order.instrumentId;
			this.logger.log(
				`[calculatePositions] Processing order: ${order.id}, type: ${order.side}, size: ${order.size} for instrument ${instrumentId}`
			);

			if (order.side === OrderSide.BUY) {
				this.processBuyOrder(positions, instrumentId, order);
			} else if (order.side === OrderSide.SELL) {
				this.processSellOrder(positions, instrumentId, order);
			}
		}

		this.logger.log(
			`[calculatePositions] Final positions: ${JSON.stringify(
				Array.from(positions.entries())
			)}`
		);

		// Filter out positions with quantity 0
		return new Map(
			Array.from(positions.entries()).filter(([_, pos]) => pos.quantity > 0)
		);
	}

	/**
	 * Processes a buy order and updates position with weighted average cost.
	 */

	private processBuyOrder(
		positions: Map<number, Position>,
		instrumentId: number,
		order: Order
	): void {
		if (!positions.has(instrumentId)) {
			positions.set(instrumentId, {
				quantity: 0,
				avgPrice: 0,
				totalCost: 0,
			});
		}

		const position = positions.get(instrumentId);
		const newTotalCost = position.totalCost + order.size * order.price;
		const newQuantity = position.quantity + order.size;

		positions.set(instrumentId, {
			quantity: newQuantity,
			avgPrice: newTotalCost / newQuantity,
			totalCost: newTotalCost,
		});

		this.logger.log(
			`[processBuyOrder] After BUY - Instrument ${instrumentId}: quantity=${newQuantity}, avgPrice=${
				newTotalCost / newQuantity
			}`
		);
	}

	/**
	 * Processes a sell order and updates position quantity.
	 */

	private processSellOrder(
		positions: Map<number, Position>,
		instrumentId: number,
		order: Order
	): void {
		if (positions.has(instrumentId)) {
			const position = positions.get(instrumentId);
			const newQuantity = position.quantity - order.size;

			this.logger.log(
				`[processSellOrder] Processing SELL - Current quantity: ${position.quantity}, Selling: ${order.size}, New quantity: ${newQuantity}`
			);

			if (newQuantity <= 0) {
				positions.delete(instrumentId);
				this.logger.log(
					`[processSellOrder] Position closed for instrument ${instrumentId}`
				);
			} else {
				positions.set(instrumentId, {
					quantity: newQuantity,
					avgPrice: position.avgPrice,
					totalCost: position.avgPrice * newQuantity,
				});
				this.logger.log(
					`[processSellOrder] Updated position for instrument ${instrumentId}: quantity=${newQuantity}`
				);
			}
		}
	}
}
