import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { Instrument } from './instrument.entity';

@Entity('marketdata')
export class MarketData {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'instrumentid' })
	instrumentId: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	high: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	low: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	open: number;

	@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
	close: number;

	@Column({
		type: 'decimal',
		precision: 10,
		scale: 2,
		nullable: true,
		name: 'previousclose',
	})
	previousClose: number;

	@Column({ type: 'date', nullable: true })
	date: Date;

	@ManyToOne(() => Instrument, (instrument) => instrument.marketData)
	@JoinColumn({ name: 'instrumentid' })
	instrument: Instrument;
}
