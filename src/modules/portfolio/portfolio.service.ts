import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { MarketdataService } from '../marketdata/marketdata.service';
import { InstrumentsService } from '../instruments/instruments.service';
import {
	PortfolioResponseDto,
	PositionDto,
} from '../../dtos/portfolio-response.dto';
import { PositionCalculatorService } from './calculator/position-calculator.service';
import { PortfolioValuationService } from './valuation/portfolio-valuation.service';

@Injectable()
export class PortfolioService {
	private readonly logger = new Logger(PortfolioService.name);

	constructor(
		private ordersService: OrdersService,
		private marketdataService: MarketdataService,
		private instrumentsService: InstrumentsService,
		private positionCalculatorService: PositionCalculatorService,
		private portfolioValuationService: PortfolioValuationService
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

		const positions =
			this.positionCalculatorService.calculatePositions(filledOrders);

		const positionArray = Array.from(positions.entries());
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
				const metrics =
					this.portfolioValuationService.calculatePositionMetrics(
						position,
						marketData
					);

				const positionDto =
					this.portfolioValuationService.createPositionDto(
						instrumentId,
						instrument,
						position,
						metrics
					);

				positionDtos.push(positionDto);
				totalPortfolioValue += metrics.currentValue;
			}
		}

		const totalDailyReturn =
			this.portfolioValuationService.calculatePortfolioDailyReturn(
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
}
