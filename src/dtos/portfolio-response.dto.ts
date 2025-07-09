import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
	@ApiProperty({ description: 'ID del instrumento' })
	instrumentId: number;

	@ApiProperty({ description: 'Ticker del instrumento' })
	ticker: string;

	@ApiProperty({ description: 'Nombre del instrumento' })
	name: string;

	@ApiProperty({ description: 'Cantidad de acciones' })
	quantity: number;

	@ApiProperty({ description: 'Valor total de la posición en pesos' })
	totalValue: number;

	@ApiProperty({ description: 'Rendimiento diario de la posición (%)' })
	dailyReturn: number;

	@ApiProperty({
		description: 'Rendimiento total de la posición desde la compra (%)',
	})
	totalReturn: number;

	@ApiProperty({ description: 'Precio promedio de compra' })
	avgPrice: number;
}

export class PortfolioResponseDto {
	@ApiProperty({
		description: 'Valor total del portfolio (efectivo + posiciones)',
	})
	totalValue: number;

	@ApiProperty({ description: 'Efectivo disponible para operar' })
	availableCash: number;

	@ApiProperty({ description: 'Rendimiento diario del portfolio (%)' })
	dailyReturn: number;

	@ApiProperty({
		type: [PositionDto],
		description: 'Lista de posiciones activas',
	})
	positions: PositionDto[];
}
