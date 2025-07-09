import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';

@Entity('users')
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar', length: 255, nullable: true })
	email: string;

	@Column({
		type: 'varchar',
		length: 20,
		nullable: true,
		name: 'accountnumber',
	})
	accountNumber: string;

	@OneToMany(() => Order, (order) => order.user)
	orders: Order[];
}
