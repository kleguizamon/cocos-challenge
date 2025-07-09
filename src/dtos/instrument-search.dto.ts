import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class InstrumentSearchDto {
  @ApiProperty({ example: 'AAPL', description: 'Search query for ticker or name' })
  @IsString()
  @IsOptional()
  q?: string;
}

export class InstrumentResponseDto {
  @ApiProperty({ example: 1, description: 'Instrument ID' })
  id: number;

  @ApiProperty({ example: 'AAPL', description: 'Instrument ticker' })
  ticker: string;

  @ApiProperty({ example: 'Apple Inc.', description: 'Instrument name' })
  name: string;

  @ApiProperty({ example: 'EQUITY', description: 'Instrument type' })
  type: string;
}