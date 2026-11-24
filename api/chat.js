import { handleApi } from '../server.js'
import { createFirebaseStore } from '../firebase.js'

const store = createFirebaseStore()
export default { fetch: (request) => handleApi(request, store) }
