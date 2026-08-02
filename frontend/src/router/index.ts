import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "@/stores/session";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/LoginView.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_PUBLIC_BASE || "/"),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "inventory",
          component: () => import("@/views/InventoryView.vue"),
        },
        {
          path: "samples/new",
          name: "sample-create",
          meta: { profiles: ["ADMIN", "OPERATOR"] },
          component: () => import("@/views/SampleCreateView.vue"),
        },
        {
          path: "drawers",
          name: "drawers",
          component: () => import("@/views/DrawersView.vue"),
        },
        {
          path: "settings",
          name: "settings",
          meta: { profiles: ["ADMIN"] },
          component: () => import("@/views/SettingsView.vue"),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const session = useSessionStore();

  if (!session.initialized) {
    await session.restore();
  }

  if (to.meta.requiresAuth && !session.authenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  const profiles = to.meta.profiles as string[] | undefined;
  if (
    profiles &&
    session.access &&
    !profiles.includes(session.access.profile)
  ) {
    return { name: "inventory" };
  }

  if (to.name === "login" && session.authenticated) {
    return { name: "inventory" };
  }
});
