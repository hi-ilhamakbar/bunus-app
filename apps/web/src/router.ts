import { createRouter, createWebHistory } from 'vue-router';
import { session } from './stores/session';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'landing', component: () => import('./views/LandingView.vue') },
    {
      path: '/member',
      name: 'member-home',
      component: () => import('./views/MemberHomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/member/login',
      name: 'member-login',
      component: () => import('./views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/member/register',
      name: 'member-register',
      component: () => import('./views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
  ],
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth && !to.meta.guestOnly) return true;
  await session.load();
  if (to.meta.requiresAuth && !session.isSignedIn.value) {
    return { name: 'member-login', query: { next: to.fullPath } };
  }
  if (to.meta.guestOnly && session.isSignedIn.value) return { name: 'member-home' };
  return true;
});

/** Only follow `next` if it is a path on this site. */
export function safeNext(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/member';
}
