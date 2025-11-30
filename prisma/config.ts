import { defineDatasource } from '@prisma/client/runtime/library';

export default defineDatasource({
  adapter: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL!,
  },
});

