import { computed, reactive } from 'vue';
import { ApiError, authApi, type CustomerProfile } from '../api/client';

// One small piece of shared state, so a store library is not worth the dependency.
const state = reactive<{ customer: CustomerProfile | null; loaded: boolean }>({
  customer: null,
  loaded: false,
});

let inflight: Promise<void> | null = null;

/** Ask the server who we are. The cookie is HttpOnly, so this is the only way to know. */
function load(): Promise<void> {
  if (state.loaded) return Promise.resolve();
  inflight ??= authApi
    .me()
    .then(({ customer }) => {
      state.customer = customer;
    })
    .catch((err: unknown) => {
      if (!(err instanceof ApiError) || err.status !== 401) {
        // Network trouble: treat as signed out for routing, but retry next navigation.
        state.customer = null;
        return;
      }
      state.customer = null;
    })
    .finally(() => {
      state.loaded = true;
      inflight = null;
    });
  return inflight;
}

export const session = {
  customer: computed(() => state.customer),
  isSignedIn: computed(() => state.customer !== null),
  load,
  setCustomer(customer: CustomerProfile): void {
    state.customer = customer;
    state.loaded = true;
  },
  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      state.customer = null;
    }
  },
};
