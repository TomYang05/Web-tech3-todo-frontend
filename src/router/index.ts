import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/lessons/:id',
      name: 'lesson',
      component: () => import('../views/LessonView.vue'),
      props: (route) => ({ id: Number(route.params.id) }),
    },
  ],
})

export default router
