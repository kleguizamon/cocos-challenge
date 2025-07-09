import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Instrument } from '../../entities/instrument.entity';

@Injectable()
export class InstrumentsService {
	constructor(
		@InjectRepository(Instrument)
		private instrumentRepository: Repository<Instrument>
	) {}

	async findOne(id: number): Promise<Instrument> {
		return this.instrumentRepository.findOne({ where: { id } });
	}

	async findAll(): Promise<Instrument[]> {
		return this.instrumentRepository.find();
	}

	async search(query: string): Promise<Instrument[]> {
		if (!query) {
			return this.instrumentRepository.find();
		}

		return this.instrumentRepository.find({
			where: [
				{ ticker: Like(`%${query.toUpperCase()}%`) },
				{ name: Like(`%${query}%`) },
			],
		});
	}
}
