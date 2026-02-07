import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { validateEnv } from '../config/env.validation';

void ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,
});

const configService = new ConfigService();

const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
const isTypeScriptRuntime = __filename.endsWith('.ts');
const sslEnabled = configService.get<string>('DATABASE_SSL') === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  entities: ENTITIES,
  migrations: [
    isTypeScriptRuntime
      ? 'src/database/migrations/*.ts'
      : 'dist/database/migrations/*.js',
  ],
  synchronize: isDevelopment,
  logging: isDevelopment,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
