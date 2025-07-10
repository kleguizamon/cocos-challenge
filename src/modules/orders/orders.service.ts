import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
	Order,
	OrderType,
	OrderSide,
	OrderStatus,
} from '../../entities/order.entity';
import { CreateOrderDto } from '../../dtos/create-order.dto';
import { UsersService } from '../users/users.service';
import { InstrumentsService } from '../instruments/instruments.service';
import { MarketdataService } from '../marketdata/marketdata.service';

@Injectable()
export class OrdersService {
	private readonly logger = new Logger(OrdersService.name);

	constructor(
		@InjectRepository(Order)
		private orderRepository: Repository<Order>,
		private usersService: UsersService,
		private instrumentsService: InstrumentsService,
		private marketdataService: MarketdataService
	) {}

	async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
		const { userId, instrumentId, side, type, size, amount, price } =
			createOrderDto;

		const user = await this.usersService.findOne(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const instrument = await this.instrumentsService.findOne(instrumentId);
		if (!instrument) {
			throw new NotFoundException('Instrument not found');
		}

		if (!size && !amount) {
			throw new BadRequestException(
				'Either size or amount must be provided'
			);
		}

		if (type === OrderType.LIMIT && !price) {
			throw new BadRequestException('Price is required for LIMIT orders');
		}

		let orderPrice = price;
		let orderSize = size;

		// for CASH_IN and CASH_OUT, the price is always 1 since it's in pesos
		if (side === OrderSide.CASH_IN || side === OrderSide.CASH_OUT) {
			orderPrice = 1;
		} else if (type === OrderType.MARKET) {
			const marketData = await this.marketdataService.getLatestMarketData(
				instrumentId
			);
			if (!marketData) {
				throw new BadRequestException(
					'Market data not available for instrument'
				);
			}
			orderPrice = marketData.close;
		}

		if (amount && !size) {
			if (!orderPrice) {
				throw new BadRequestException(
					'Cannot calculate size without price'
				);
			}
			orderSize = Math.floor(amount / orderPrice);
			if (orderSize <= 0) {
				throw new BadRequestException('Amount too small to buy any shares');
			}
		}

		const validationResult = await this.validateOrder(
			userId,
			instrumentId,
			side,
			orderSize,
			orderPrice
		);
		if (!validationResult.isValid) {
			const order = this.orderRepository.create({
				userId,
				instrumentId,
				side,
				type,
				size: orderSize,
				price: orderPrice,
				status: OrderStatus.REJECTED,
			});
			return this.orderRepository.save(order);
		}

		const order = this.orderRepository.create({
			userId,
			instrumentId,
			side,
			type,
			size: orderSize,
			price: orderPrice,
			status:
				type === OrderType.MARKET ||
				side === OrderSide.CASH_IN ||
				side === OrderSide.CASH_OUT
					? OrderStatus.FILLED
					: OrderStatus.NEW,
		});

		return this.orderRepository.save(order);
	}

	async findOrdersByUser(userId: number): Promise<Order[]> {
		return this.orderRepository.find({
			where: { userId },
			relations: ['instrument'],
			order: { datetime: 'DESC' },
		});
	}

	async cancelOrder(orderId: number): Promise<Order> {
		const order = await this.orderRepository.findOne({
			where: { id: orderId },
		});
		if (!order) {
			throw new NotFoundException('Order not found');
		}

		if (order.status !== OrderStatus.NEW) {
			throw new BadRequestException('Only NEW orders can be cancelled');
		}

		order.status = OrderStatus.CANCELLED;
		return this.orderRepository.save(order);
	}

	async getFilledOrdersByUser(userId: number): Promise<Order[]> {
		return this.orderRepository.find({
			where: { userId, status: OrderStatus.FILLED },
			relations: ['instrument'],
		});
	}

	async getAllFilledOrders(): Promise<Order[]> {
		return this.orderRepository.find({
			where: { status: OrderStatus.FILLED },
			relations: ['instrument'],
		});
	}

	private async validateOrder(
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

	public async calculateAvailableCash(userId: number): Promise<number> {
		this.logger.log(
			`[calculateAvailableCash] Starting for userId: ${userId}`
		);
		const orders = await this.getFilledOrdersByUser(userId);
		this.logger.log(
			`[calculateAvailableCash] Found ${orders.length} filled orders.`
		);

		let cash = 0;

		for (const order of orders) {
			const value = order.size * order.price;
			if (order.instrument.type === 'MONEDA') {
				if (order.side === OrderSide.CASH_IN) {
					cash += value;
				} else if (order.side === OrderSide.CASH_OUT) {
					cash -= value;
				}
			} else {
				if (order.side === OrderSide.BUY) {
					cash -= value;
				} else if (order.side === OrderSide.SELL) {
					cash += value;
				}
			}
			this.logger.log(
				`[calculateAvailableCash] Order ${order.id} (${order.side} ${order.instrument.ticker}), cash is now: ${cash}`
			);
		}

		this.logger.log(
			`[calculateAvailableCash] Final cash for userId ${userId}: ${cash}`
		);
		return Math.max(0, cash);
	}

	private async calculateAvailableShares(
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
}
