import {
	Controller,
	Post,
	Get,
	Patch,
	Body,
	Param,
	ParseIntPipe,
	HttpStatus,
	InternalServerErrorException,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import {
	ApiTags,
	ApiResponse,
	ApiParam,
	ApiOperation,
	ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from '../../dtos/create-order.dto';
import { OrderResponseDto } from '../../dtos/order-response.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@Post()
	@ApiOperation({
		summary: 'Create new order',
		description: 'Creates MARKET/LIMIT orders with validation.',
	})
	@ApiBody({
		type: CreateOrderDto,
		description: 'Order creation data',
		examples: {
			marketBuy: {
				summary: 'Market Buy Order',
				value: {
					userId: 1,
					instrumentId: 1,
					side: 'BUY',
					type: 'MARKET',
					size: 10,
				},
			},
			limitSell: {
				summary: 'Limit Sell Order',
				value: {
					userId: 1,
					instrumentId: 1,
					side: 'SELL',
					type: 'LIMIT',
					size: 5,
					price: 175.0,
				},
			},
			cashIn: {
				summary: 'Cash Deposit',
				value: {
					userId: 1,
					instrumentId: 66,
					side: 'CASH_IN',
					type: 'MARKET',
					size: 10000,
					price: 1.0,
				},
			},
			amountBased: {
				summary: 'Amount-based Order',
				value: {
					userId: 1,
					instrumentId: 1,
					side: 'BUY',
					type: 'MARKET',
					amount: 1500,
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'Order created successfully.',
		type: OrderResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid order data or validation error',
		schema: {
			example: {
				statusCode: 400,
				message: 'Either size or amount must be provided',
				error: 'Bad Request',
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User or instrument not found',
		schema: {
			example: {
				statusCode: 404,
				message: 'User not found',
				error: 'Not Found',
			},
		},
	})
	async createOrder(@Body() createOrderDto: CreateOrderDto) {
		try {
			return await this.ordersService.createOrder(createOrderDto);
		} catch (error) {
			if (
				error.message.includes('not found') ||
				error.message.includes('User not found') ||
				error.message.includes('Instrument not found')
			) {
				throw new NotFoundException(error.message);
			}
			if (
				error.message.includes('insufficient') ||
				error.message.includes('validation') ||
				error.message.includes('must be provided')
			) {
				throw new BadRequestException(error.message);
			}
			throw new InternalServerErrorException(
				'Failed to create order',
				error.message
			);
		}
	}

	@Get(':userId')
	@ApiOperation({
		summary: 'Get user orders',
		description: 'Retrieves all orders for a user.',
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID',
		type: 'number',
		example: 1,
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'List of user orders.',
		type: [OrderResponseDto],
	})
	async getUserOrders(@Param('userId', ParseIntPipe) userId: number) {
		try {
			return await this.ordersService.findOrdersByUser(userId);
		} catch (error) {
			if (
				error.message.includes('not found') ||
				error.message.includes('User not found')
			) {
				throw new NotFoundException('User not found');
			}
			throw new InternalServerErrorException(
				'Failed to retrieve user orders',
				error.message
			);
		}
	}

	@Patch(':orderId/cancel')
	@ApiOperation({
		summary: 'Cancel order',
		description: 'Cancels an order in NEW status.',
	})
	@ApiParam({
		name: 'orderId',
		description: 'Order ID to cancel',
		type: 'number',
		example: 1,
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Order cancelled successfully.',
		type: OrderResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Order cannot be cancelled',
		schema: {
			example: {
				statusCode: 400,
				message: 'Only NEW orders can be cancelled',
				error: 'Bad Request',
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'Order not found',
		schema: {
			example: {
				statusCode: 404,
				message: 'Order not found',
				error: 'Not Found',
			},
		},
	})
	async cancelOrder(@Param('orderId', ParseIntPipe) orderId: number) {
		try {
			return await this.ordersService.cancelOrder(orderId);
		} catch (error) {
			if (
				error.message.includes('not found') ||
				error.message.includes('Order not found')
			) {
				throw new NotFoundException('Order not found');
			}
			if (
				error.message.includes('cannot be cancelled') ||
				error.message.includes('Only NEW orders')
			) {
				throw new BadRequestException(error.message);
			}
			throw new InternalServerErrorException(
				'Failed to cancel order',
				error.message
			);
		}
	}
}
