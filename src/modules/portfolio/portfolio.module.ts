import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { OrdersModule } from '../orders/orders.module';
import { MarketdataModule } from '../marketdata/marketdata.module';
import { InstrumentsModule } from '../instruments/instruments.module';

@Module({
  imports: [OrdersModule, MarketdataModule, InstrumentsModule],
  providers: [PortfolioService],
  controllers: [PortfolioController],
})
export class PortfolioModule {}