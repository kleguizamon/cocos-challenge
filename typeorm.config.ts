import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
	type: 'postgres',
	host: process.env.DATABASE_HOST,
	port: parseInt(process.env.DATABASE_PORT, 10),
	username: process.env.DATABASE_USERNAME,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	entities: ['src/**/*.entity.ts'],
	synchronize: true,
	ssl: true,
	extra: {
		ssl: {
			rejectUnauthorized: false,
		},
	},
});
