import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { MarketdataService } from '../marketdata/marketdata.service';
import { InstrumentsService } from '../instruments/instruments.service';
import {
	PortfolioResponseDto,
	PositionDto,
} from '../../dtos/portfolio-response.dto';
import { OrderSide } from '../../entities/order.entity';

@Injectable()
export class PortfolioService {
	private readonly logger = new Logger(PortfolioService.name);

	constructor(
		private ordersService: OrdersService,
		private marketdataService: MarketdataService,
		private instrumentsService: InstrumentsService
	) {}

	async getPortfolio(userId: number): Promise<PortfolioResponseDto> {
		this.logger.log(`[getPortfolio] Starting for userId: ${userId}`);

		const [filledOrders, totalCash] = await Promise.all([
			this.ordersService.getFilledOrdersByUser(userId),
			this.ordersService.calculateAvailableCash(userId),
		]);

		this.logger.log(
			`[getPortfolio] Found ${filledOrders.length} filled orders and availableCash: ${totalCash}`
		);

		const positions = new Map<
			number,
			{ quantity: number; avgPrice: number; totalCost: number }
		>();

		for (const order of filledOrders) {
			// La lógica de CASH_IN/OUT ya está cubierta por calculateAvailableCash.
			// Solo procesamos compras y ventas de activos.
			if (order.instrument.type === 'MONEDA') {
				continue;
			}

			const instrumentId = order.instrumentId;
			this.logger.log(
				`[getPortfolio] Processing asset order: ${order.id} for instrument ${instrumentId}`
			);

			if (order.side === OrderSide.BUY) {
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
			} else if (order.side === OrderSide.SELL) {
				if (positions.has(instrumentId)) {
					const position = positions.get(instrumentId);
					const newQuantity = position.quantity - order.size;

					if (newQuantity <= 0) {
						positions.delete(instrumentId);
					} else {
						positions.set(instrumentId, {
							quantity: newQuantity,
							avgPrice: position.avgPrice,
							totalCost: position.avgPrice * newQuantity,
						});
					}
				}
			}
		}

		this.logger.log(
			`[getPortfolio] Final positions map: ${JSON.stringify(
				Array.from(positions.entries())
			)}`
		);

		const positionArray = Array.from(positions.entries()).filter(
			([_, pos]) => pos.quantity > 0
		);
		const instrumentIds = positionArray.map(([instrumentId]) => instrumentId);

		const marketDataList =
			await this.marketdataService.getMarketDataByInstruments(instrumentIds);
		const marketDataMap = new Map(
			marketDataList.map((md) => [md.instrumentId, md])
		);

		const positionDtos: PositionDto[] = [];
		let totalPortfolioValue = totalCash;

		for (const [instrumentId, position] of positionArray) {
			const instrument = await this.instrumentsService.findOne(instrumentId);
			const marketData = marketDataMap.get(instrumentId);

			if (instrument && marketData) {
				const currentValue = position.quantity * marketData.close;
				const dailyReturn =
					((marketData.close - marketData.previousClose) /
						marketData.previousClose) *
					100;
				const totalReturn =
					((marketData.close - position.avgPrice) / position.avgPrice) *
					100;

				positionDtos.push({
					instrumentId,
					ticker: instrument.ticker,
					name: instrument.name,
					quantity: position.quantity,
					totalValue: currentValue,
					dailyReturn: dailyReturn,
					totalReturn: totalReturn,
					avgPrice: position.avgPrice,
				});

				totalPortfolioValue += currentValue;
			}
		}

		const totalDailyReturn = this.calculatePortfolioDailyReturn(
			positionDtos,
			totalPortfolioValue
		);

		const result = {
			totalValue: totalPortfolioValue,
			availableCash: totalCash,
			dailyReturn: totalDailyReturn,
			positions: positionDtos,
		};

		this.logger.log(`[getPortfolio] Final result: ${JSON.stringify(result)}`);
		return result;
	}

	private calculatePortfolioDailyReturn(
		positions: PositionDto[],
		totalValue: number
	): number {
		if (totalValue === 0) return 0;

		let weightedReturn = 0;
		for (const position of positions) {
			const weight = position.totalValue / totalValue;
			weightedReturn += weight * position.dailyReturn;
		}

		return weightedReturn;
	}
}
