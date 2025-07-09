import { IsNumber, IsEnum, IsOptional, ValidateIf, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType, OrderSide } from '../entities/order.entity';

export class CreateOrderDto {
  @ApiProperty({ 
    example: 1, 
    description: 'User ID who is placing the order',
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  userId: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Instrument ID to trade. Use 66 for ARS (cash operations)',
    minimum: 1
  })
  @IsNumber()
  @IsPositive()
  instrumentId: number;

  @ApiProperty({ 
    example: 'BUY', 
    enum: OrderSide, 
    description: 'Order side: BUY (purchase shares), SELL (sell shares), CASH_IN (deposit cash), CASH_OUT (withdraw cash)',
    enumName: 'OrderSide'
  })
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({ 
    example: 'MARKET', 
    enum: OrderType, 
    description: 'Order type: MARKET (execute immediately at current price), LIMIT (execute when price is reached)',
    enumName: 'OrderType'
  })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Exact quantity of shares to trade. Required if amount is not provided. Must be positive integer.',
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  size?: number;

  @ApiPropertyOptional({ 
    example: 1500, 
    description: 'Total amount in pesos. Alternative to size - system will calculate maximum shares possible. Must be positive.',
    minimum: 0.01
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ 
    example: 174.50, 
    description: 'Price per share. Required for LIMIT orders, ignored for MARKET orders. Must be positive.',
    minimum: 0.01
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @ValidateIf(o => o.type === OrderType.LIMIT)
  price?: number;
}