import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketData } from '../../entities/marketdata.entity';

@Injectable()
export class MarketdataService {
	constructor(
		@InjectRepository(MarketData)
		private marketDataRepository: Repository<MarketData>
	) {}

	async getLatestMarketData(instrumentId: number): Promise<MarketData> {
		return this.marketDataRepository.findOne({
			where: { instrumentId },
			order: { date: 'DESC' },
		});
	}

	async getMarketDataByInstruments(
		instrumentIds: number[]
	): Promise<MarketData[]> {
		if (instrumentIds.length === 0) {
			return [];
		}
		return this.marketDataRepository
			.createQueryBuilder('marketdata')
			.where('marketdata.instrumentId IN (:...instrumentIds)', {
				instrumentIds,
			})
			.andWhere(
				'marketdata.date = (SELECT MAX(date) FROM marketdata m2 WHERE m2.instrumentId = marketdata.instrumentId)'
			)
			.getMany();
	}
}
