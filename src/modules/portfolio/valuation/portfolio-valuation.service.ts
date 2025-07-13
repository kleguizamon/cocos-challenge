import { Injectable } from '@nestjs/common';
import { PositionDto } from '../../../dtos/portfolio-response.dto';
import { MarketData } from '../../../entities/marketdata.entity';
import { Instrument } from '../../../entities/instrument.entity';
import { Position } from '../calculator/position-calculator.service';

@Injectable()
export class PortfolioValuationService {
	calculatePositionMetrics(
		position: Position,
		marketData: MarketData
	): {
		currentValue: number;
		dailyReturn: number;
		totalReturn: number;
	} {
		const currentValue = position.quantity * marketData.close;
		const dailyReturn =
			((marketData.close - marketData.previousClose) /
				marketData.previousClose) *
			100;
		const totalReturn =
			((marketData.close - position.avgPrice) / position.avgPrice) * 100;

		return {
			currentValue,
			dailyReturn,
			totalReturn,
		};
	}

	createPositionDto(
		instrumentId: number,
		instrument: Instrument,
		position: Position,
		metrics: {
			currentValue: number;
			dailyReturn: number;
			totalReturn: number;
		}
	): PositionDto {
		return {
			instrumentId,
			ticker: instrument.ticker,
			name: instrument.name,
			quantity: position.quantity,
			totalValue: metrics.currentValue,
			dailyReturn: metrics.dailyReturn,
			totalReturn: metrics.totalReturn,
			avgPrice: position.avgPrice,
		};
	}

	calculatePortfolioDailyReturn(
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
