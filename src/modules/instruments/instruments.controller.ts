import {
	Controller,
	Get,
	Query,
	HttpStatus,
	InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { InstrumentsService } from './instruments.service';
import { InstrumentResponseDto } from '../../dtos/instrument-search.dto';

@ApiTags('instruments')
@Controller('instruments')
export class InstrumentsController {
	constructor(private readonly instrumentsService: InstrumentsService) {}

	@Get()
	@ApiOperation({
		summary: 'Get all instruments',
		description:
			'Retrieves all available trading instruments including stocks, ETFs, and currencies',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description:
			'List of all available trading instruments including stocks, ETFs, and currencies',
		type: [InstrumentResponseDto],
	})
	async findAll() {
		try {
			return await this.instrumentsService.findAll();
		} catch (error) {
			throw new InternalServerErrorException(
				'Failed to retrieve instruments',
				error.message
			);
		}
	}

	@Get('search')
	@ApiOperation({
		summary: 'Search instruments',
		description:
			'Search for instruments by ticker symbol or company name. If no query is provided, returns all instruments.',
	})
	@ApiQuery({
		name: 'q',
		required: false,
		description: 'Search query for ticker or name (case insensitive)',
		example: 'AAPL',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description:
			'List of instruments matching the search query (by ticker or name). Returns all instruments if no query provided.',
		type: [InstrumentResponseDto],
	})
	async search(@Query('query') query: string) {
		try {
			return await this.instrumentsService.search(query);
		} catch (error) {
			throw new InternalServerErrorException(
				'Failed to search instruments',
				error.message
			);
		}
	}
}
