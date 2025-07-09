import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketData } from '../../entities/marketdata.entity';
import { MarketdataService } from './marketdata.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketData])],
  providers: [MarketdataService],
  exports: [MarketdataService],
})
export class MarketdataModule {}