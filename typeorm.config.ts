import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
	type: 'postgres',
	host:
		process.env.DATABASE_HOST ||
		'ep-fancy-voice-a8usl8mp-pooler.eastus2.azure.neon.tech',
	port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
	username: process.env.DATABASE_USERNAME || 'neondb_owner',
	password: process.env.DATABASE_PASSWORD || 'npg_SLDxY7hZMt3T',
	database: process.env.DATABASE_NAME || 'neondb',
	entities: ['src/**/*.entity.ts'],
	synchronize: true,
	ssl: true,
	extra: {
		ssl: {
			rejectUnauthorized: false,
		},
	},
});
