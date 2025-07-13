import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix('api');
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		})
	);

	const config = new DocumentBuilder()
		.setTitle('Trading API')
		.setDescription(
			`	# Trading/Broker API

			Complete trading system built with NestJS, TypeORM, and PostgreSQL.

			## Features
			- **Portfolio Management**: Real-time portfolio valuations with daily returns
			- **Order Management**: MARKET and LIMIT orders with full validation
			- **Instrument Search**: Search by ticker or company name
			- **Cash Operations**: Deposits and withdrawals via CASH_IN/CASH_OUT

			## Order Types
			- **MARKET**: Executes immediately at current market price → Status: FILLED
			- **LIMIT**: Executes when price reaches specified level → Status: NEW

			## Order Sides
			- **BUY**: Purchase shares (validates available cash)
			- **SELL**: Sell shares (validates share ownership)
			- **CASH_IN**: Deposit cash (instrument ID 66 - ARS)
			- **CASH_OUT**: Withdraw cash (validates available balance)

			## Order Status Flow
			- **NEW**: Limit order placed, waiting for execution
			- **FILLED**: Order executed successfully
			- **REJECTED**: Order rejected due to insufficient funds/shares
			- **CANCELLED**: Order cancelled by user (only NEW orders)     `
		)
		.setVersion('1.0')
		.addTag('orders', 'Order management endpoints')
		.addTag('portfolio', 'Portfolio and position endpoints')
		.addTag('instruments', 'Instrument search and data endpoints')
		.setContact('Trading API Support', '', 'support@tradingapi.com')
		.setLicense('MIT', 'https://opensource.org/licenses/MIT')
		.addServer('http://localhost:4000', 'Development server')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/docs', app, document);

	const port = process.env.PORT || 4000;
	await app.listen(port);
	console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
