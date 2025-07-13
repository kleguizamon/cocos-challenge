import {
	Controller,
	Get,
	Param,
	ParseIntPipe,
	HttpStatus,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiParam, ApiOperation } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { PortfolioResponseDto } from '../../dtos/portfolio-response.dto';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
	constructor(private readonly portfolioService: PortfolioService) {}

	@Get(':userId')
	@ApiOperation({
		summary: 'Get user portfolio',
		description:
			'Retrieves the complete portfolio for a user including total value, available cash, daily returns, and all positions with current market valuations.',
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID to get portfolio for',
		type: 'number',
		example: 1,
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description:
			'User portfolio with total value, available cash, daily returns and all positions with current market valuations',
		type: PortfolioResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
		schema: {
			example: {
				statusCode: 404,
				message: 'User not found',
				error: 'Not Found',
			},
		},
	})
	async getPortfolio(@Param('userId', ParseIntPipe) userId: number) {
		try {
			return await this.portfolioService.getPortfolio(userId);
		} catch (error) {
			if (
				error.message.includes('not found') ||
				error.message.includes('User not found')
			) {
				throw new NotFoundException('User not found');
			}
			throw new InternalServerErrorException(
				'Failed to retrieve portfolio',
				error.message
			);
		}
	}
}
