import {
	Injectable,
	BadRequestException,
	NotFoundException,
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
import { OrderValidationService } from './validation/order-validation.service';
import { OrderPricingService } from './pricing/order-pricing.service';

@Injectable()
export class OrdersService {
	constructor(
		@InjectRepository(Order)
		private orderRepository: Repository<Order>,
		private usersService: UsersService,
		private instrumentsService: InstrumentsService,
		private orderValidationService: OrderValidationService,
		private orderPricingService: OrderPricingService
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

		const orderPrice = await this.orderPricingService.calculateOrderPrice(
			side,
			type,
			instrumentId,
			price
		);

		let orderSize = size;
		if (amount && !size) {
			orderSize = this.orderPricingService.calculateOrderSize(
				amount,
				orderPrice
			);
		}

		const validationResult = await this.orderValidationService.validateOrder(
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

	public async calculateAvailableCash(userId: number): Promise<number> {
		return this.orderValidationService.calculateAvailableCash(userId);
	}
}
