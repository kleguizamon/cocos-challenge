import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { MarketdataModule } from './modules/marketdata/marketdata.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    InstrumentsModule,
    OrdersModule,
    PortfolioModule,
    MarketdataModule,
  ],
})
export class AppModule {}