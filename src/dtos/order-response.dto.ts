import { ApiProperty } from '@nestjs/swagger';
import { OrderType, OrderSide, OrderStatus } from '../entities/order.entity';

export class OrderResponseDto {
  @ApiProperty({ example: 1, description: 'Order ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Instrument ID' })
  instrumentId: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 'BUY', enum: OrderSide, description: 'Order side' })
  side: OrderSide;

  @ApiProperty({ example: 10, description: 'Quantity of shares' })
  size: number;

  @ApiProperty({ example: 100.50, description: 'Order price' })
  price: number;

  @ApiProperty({ example: 'MARKET', enum: OrderType, description: 'Order type' })
  type: OrderType;

  @ApiProperty({ example: 'FILLED', enum: OrderStatus, description: 'Order status' })
  status: OrderStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Order datetime' })
  datetime: string;
}