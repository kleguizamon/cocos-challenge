import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { MarketData } from './marketdata.entity';

@Entity('instruments')
export class Instrument {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 10, nullable: true })
	ticker: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	name: string;

	@Column({ type: 'varchar', length: 10, nullable: true })
	type: string;

	@OneToMany(() => Order, (order) => order.instrument)
	orders: Order[];

	@OneToMany(() => MarketData, (marketdata) => marketdata.instrument)
	marketData: MarketData[];
}
