import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderValidationService } from './order-validation.service';
import { OrderPricingService } from './order-pricing.service';
import { UsersModule } from '../users/users.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { MarketdataModule } from '../marketdata/marketdata.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    UsersModule,
    InstrumentsModule,
    MarketdataModule,
  ],
  providers: [OrdersService, OrderValidationService, OrderPricingService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}