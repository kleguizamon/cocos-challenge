import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderType, OrderSide } from '../../../entities/order.entity';
import { MarketdataService } from '../../marketdata/marketdata.service';

@Injectable()
export class OrderPricingService {
	constructor(private marketdataService: MarketdataService) {}

	async calculateOrderPrice(
		side: OrderSide,
		type: OrderType,
		instrumentId: number,
		providedPrice?: number
	): Promise<number> {
		if (side === OrderSide.CASH_IN || side === OrderSide.CASH_OUT) {
			return 1;
		}

		if (type === OrderType.MARKET) {
			const marketData = await this.marketdataService.getLatestMarketData(
				instrumentId
			);
			if (!marketData) {
				throw new BadRequestException(
					'Market data not available for instrument'
				);
			}
			return marketData.close;
		}

		if (type === OrderType.LIMIT && !providedPrice) {
			throw new BadRequestException('Price is required for LIMIT orders');
		}

		return providedPrice;
	}

	calculateOrderSize(amount: number, price: number): number {
		if (!price) {
			throw new BadRequestException('Cannot calculate size without price');
		}
		const orderSize = Math.floor(amount / price);
		if (orderSize <= 0) {
			throw new BadRequestException('Amount too small to buy any shares');
		}
		return orderSize;
	}
}
