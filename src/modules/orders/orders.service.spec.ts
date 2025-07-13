import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrdersService } from './orders.service';
import {
	Order,
	OrderType,
	OrderSide,
	OrderStatus,
} from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Instrument } from '../../entities/instrument.entity';
import { CreateOrderDto } from '../../dtos/create-order.dto';
import { UsersService } from '../users/users.service';
import { InstrumentsService } from '../instruments/instruments.service';
import { OrderValidationService } from './validation/order-validation.service';
import { OrderPricingService } from './pricing/order-pricing.service';

describe('OrdersService', () => {
	let service: OrdersService;
	let orderRepository: jest.Mocked<Repository<Order>>;
	let usersService: jest.Mocked<UsersService>;
	let instrumentsService: jest.Mocked<InstrumentsService>;
	let orderValidationService: jest.Mocked<OrderValidationService>;
	let orderPricingService: jest.Mocked<OrderPricingService>;

	const mockUser: Partial<User> = {
		id: 1,
		email: 'test@test.com',
		accountNumber: 'ACC001',
	};
	const mockInstrument: Partial<Instrument> = {
		id: 1,
		ticker: 'AAPL',
		name: 'Apple Inc.',
		type: 'Stock',
	};
	const mockOrder = {
		id: 1,
		userId: 1,
		instrumentId: 1,
		side: OrderSide.BUY,
		type: OrderType.MARKET,
		size: 100,
		price: 150.0,
		status: OrderStatus.FILLED,
		datetime: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OrdersService,
				{
					provide: getRepositoryToken(Order),
					useValue: {
						create: jest.fn(),
						save: jest.fn(),
						find: jest.fn(),
						findOne: jest.fn(),
					},
				},
				{
					provide: UsersService,
					useValue: {
						findOne: jest.fn(),
					},
				},
				{
					provide: InstrumentsService,
					useValue: {
						findOne: jest.fn(),
					},
				},
				{
					provide: OrderValidationService,
					useValue: {
						validateOrder: jest.fn(),
						calculateAvailableCash: jest.fn(),
					},
				},
				{
					provide: OrderPricingService,
					useValue: {
						calculateOrderPrice: jest.fn(),
						calculateOrderSize: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<OrdersService>(OrdersService);
		orderRepository = module.get(getRepositoryToken(Order));
		usersService = module.get(UsersService);
		instrumentsService = module.get(InstrumentsService);
		orderValidationService = module.get(OrderValidationService);
		orderPricingService = module.get(OrderPricingService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('createOrder', () => {
		const createOrderDto: CreateOrderDto = {
			userId: 1,
			instrumentId: 1,
			side: OrderSide.BUY,
			type: OrderType.MARKET,
			size: 100,
		};

		it('should create a market order successfully', async () => {
			// Arrange
			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue(
				mockInstrument as Instrument
			);
			orderPricingService.calculateOrderPrice.mockResolvedValue(150.0);
			orderValidationService.validateOrder.mockResolvedValue({
				isValid: true,
			});
			orderRepository.create.mockReturnValue(mockOrder as Order);
			orderRepository.save.mockResolvedValue(mockOrder as Order);

			// Act
			const result = await service.createOrder(createOrderDto);

			// Assert
			expect(usersService.findOne).toHaveBeenCalledWith(1);
			expect(instrumentsService.findOne).toHaveBeenCalledWith(1);
			expect(orderPricingService.calculateOrderPrice).toHaveBeenCalledWith(
				OrderSide.BUY,
				OrderType.MARKET,
				1,
				undefined
			);
			expect(orderValidationService.validateOrder).toHaveBeenCalledWith(
				1,
				1,
				OrderSide.BUY,
				100,
				150.0
			);
			expect(orderRepository.create).toHaveBeenCalledWith({
				userId: 1,
				instrumentId: 1,
				side: OrderSide.BUY,
				type: OrderType.MARKET,
				size: 100,
				price: 150.0,
				status: OrderStatus.FILLED,
			});
			expect(result).toEqual(mockOrder);
		});

		it('should create a limit order with NEW status', async () => {
			const limitOrderDto = {
				...createOrderDto,
				type: OrderType.LIMIT,
				price: 145.0,
			};

			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue(
				mockInstrument as Instrument
			);
			orderPricingService.calculateOrderPrice.mockResolvedValue(145.0);
			orderValidationService.validateOrder.mockResolvedValue({
				isValid: true,
			});
			orderRepository.create.mockReturnValue({
				...mockOrder,
				status: OrderStatus.NEW,
			} as Order);
			orderRepository.save.mockResolvedValue({
				...mockOrder,
				status: OrderStatus.NEW,
			} as Order);

			const result = await service.createOrder(limitOrderDto);

			expect(orderRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: OrderStatus.NEW,
				})
			);
		});

		it('should create order by amount when size not provided', async () => {
			const amountOrderDto = {
				userId: 1,
				instrumentId: 1,
				side: OrderSide.BUY,
				type: OrderType.MARKET,
				amount: 15000,
			};

			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue(
				mockInstrument as Instrument
			);
			orderPricingService.calculateOrderPrice.mockResolvedValue(150.0);
			orderPricingService.calculateOrderSize.mockReturnValue(100);
			orderValidationService.validateOrder.mockResolvedValue({
				isValid: true,
			});
			orderRepository.create.mockReturnValue(mockOrder as Order);
			orderRepository.save.mockResolvedValue(mockOrder as Order);

			const result = await service.createOrder(amountOrderDto);

			expect(orderPricingService.calculateOrderSize).toHaveBeenCalledWith(
				15000,
				150.0
			);
			expect(orderValidationService.validateOrder).toHaveBeenCalledWith(
				1,
				1,
				OrderSide.BUY,
				100,
				150.0
			);
		});

		it('should create CASH_IN order with FILLED status', async () => {
			const cashInDto = {
				userId: 1,
				instrumentId: 66, // ARS currency
				side: OrderSide.CASH_IN,
				type: OrderType.MARKET,
				size: 10000,
			};

			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue({
				...mockInstrument,
				id: 66,
				type: 'MONEDA',
			} as Instrument);
			orderPricingService.calculateOrderPrice.mockResolvedValue(1.0);
			orderValidationService.validateOrder.mockResolvedValue({
				isValid: true,
			});
			orderRepository.create.mockReturnValue({
				...mockOrder,
				status: OrderStatus.FILLED,
			} as Order);
			orderRepository.save.mockResolvedValue({
				...mockOrder,
				status: OrderStatus.FILLED,
			} as Order);

			const result = await service.createOrder(cashInDto);

			expect(orderRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: OrderStatus.FILLED,
				})
			);
		});

		it('should create REJECTED order when validation fails', async () => {
			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue(
				mockInstrument as Instrument
			);
			orderPricingService.calculateOrderPrice.mockResolvedValue(150.0);
			orderValidationService.validateOrder.mockResolvedValue({
				isValid: false,
				reason: 'Insufficient cash',
			});
			orderRepository.create.mockReturnValue({
				...mockOrder,
				status: OrderStatus.REJECTED,
			} as Order);
			orderRepository.save.mockResolvedValue({
				...mockOrder,
				status: OrderStatus.REJECTED,
			} as Order);

			const result = await service.createOrder(createOrderDto);

			expect(orderRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					status: OrderStatus.REJECTED,
				})
			);
		});

		it('should throw NotFoundException when user not found', async () => {
			usersService.findOne.mockResolvedValue(null);

			await expect(service.createOrder(createOrderDto)).rejects.toThrow(
				NotFoundException
			);
			expect(usersService.findOne).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException when instrument not found', async () => {
			usersService.findOne.mockResolvedValue(mockUser as User);
			instrumentsService.findOne.mockResolvedValue(null);

			await expect(service.createOrder(createOrderDto)).rejects.toThrow(
				NotFoundException
			);
			expect(instrumentsService.findOne).toHaveBeenCalledWith(1);
		});
	});

	describe('cancelOrder', () => {
		it('should cancel order successfully', async () => {
			const orderToCancel = { ...mockOrder, status: OrderStatus.NEW };
			const cancelledOrder = {
				...orderToCancel,
				status: OrderStatus.CANCELLED,
			};

			orderRepository.findOne.mockResolvedValue(orderToCancel as Order);
			orderRepository.save.mockResolvedValue(cancelledOrder as Order);

			const result = await service.cancelOrder(1);

			expect(orderRepository.findOne).toHaveBeenCalledWith({
				where: { id: 1 },
			});
			expect(orderRepository.save).toHaveBeenCalledWith(cancelledOrder);
			expect(result.status).toBe(OrderStatus.CANCELLED);
		});

		it('should throw NotFoundException when order not found', async () => {
			orderRepository.findOne.mockResolvedValue(null);

			await expect(service.cancelOrder(999)).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('getFilledOrdersByUser', () => {
		it('should return only filled orders for user', async () => {
			const filledOrders = [{ ...mockOrder, status: OrderStatus.FILLED }];
			orderRepository.find.mockResolvedValue(filledOrders as Order[]);

			const result = await service.getFilledOrdersByUser(1);

			expect(orderRepository.find).toHaveBeenCalledWith({
				where: { userId: 1, status: OrderStatus.FILLED },
				relations: ['instrument'],
			});
			expect(result).toEqual(filledOrders);
		});
	});

	describe('getAllFilledOrders', () => {
		it('should return all filled orders', async () => {
			const filledOrders = [{ ...mockOrder, status: OrderStatus.FILLED }];
			orderRepository.find.mockResolvedValue(filledOrders as Order[]);

			const result = await service.getAllFilledOrders();

			expect(orderRepository.find).toHaveBeenCalledWith({
				where: { status: OrderStatus.FILLED },
				relations: ['instrument'],
			});
			expect(result).toEqual(filledOrders);
		});
	});

	describe('calculateAvailableCash', () => {
		it('should delegate to validation service', async () => {
			const expectedCash = 50000;
			orderValidationService.calculateAvailableCash.mockResolvedValue(
				expectedCash
			);

			const result = await service.calculateAvailableCash(1);

			expect(
				orderValidationService.calculateAvailableCash
			).toHaveBeenCalledWith(1);
			expect(result).toBe(expectedCash);
		});
	});
});
