import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Instrument } from './instrument.entity';

export enum OrderType {
	MARKET = 'MARKET',
	LIMIT = 'LIMIT',
}

export enum OrderSide {
	BUY = 'BUY',
	SELL = 'SELL',
	CASH_IN = 'CASH_IN',
	CASH_OUT = 'CASH_OUT',
}

export enum OrderStatus {
	NEW = 'NEW',
	FILLED = 'FILLED',
	REJECTED = 'REJECTED',
	CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'instrumentid' })
	instrumentId: number;

	@Column({ name: 'userid' })
	userId: number;

	@Column()
	size: number;

	@Column({ type: 'decimal', precision: 10, scale: 2 })
	price: number;

	@Column({ type: 'varchar', length: 10 })
	type: OrderType;

	@Column({ type: 'varchar', length: 10 })
	side: OrderSide;

	@Column({ type: 'varchar', length: 20 })
	status: OrderStatus;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	datetime: Date;

	@ManyToOne(() => User, (user) => user.orders)
	@JoinColumn({ name: 'userid' })
	user: User;

	@ManyToOne(() => Instrument, (instrument) => instrument.orders)
	@JoinColumn({ name: 'instrumentid' })
	instrument: Instrument;
}
