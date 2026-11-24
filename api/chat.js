import { handleApi } from '../server.js'
import { createRedisStore } from '../redis.js'

const store = createRedisStore()
export default { fetch: (request) => handleApi(request, store) }
