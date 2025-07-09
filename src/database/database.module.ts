import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Instrument, Order, MarketData } from '../entities';

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				type: 'postgres',
				host: configService.get('DATABASE_HOST'),
				port: +configService.get('DATABASE_PORT'),
				username: configService.get('DATABASE_USERNAME'),
				password: configService.get('DATABASE_PASSWORD'),
				database: configService.get('DATABASE_NAME'),
				entities: [User, Instrument, Order, MarketData],
				synchronize: true,
				logging: true,
				ssl: true,
				extra: {
					ssl: {
						rejectUnauthorized: false,
					},
				},
			}),
			inject: [ConfigService],
		}),
	],
})
export class DatabaseModule {}
