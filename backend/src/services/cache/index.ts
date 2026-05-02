/**
 * Cache service exports
 */
export {
  cacheService,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheSetExpire,
  cacheDelByPattern,
  cacheIsAvailable,
  cacheGetStats,
} from './redis';
