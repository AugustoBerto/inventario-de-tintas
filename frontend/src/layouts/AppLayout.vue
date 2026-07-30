<script setup lang="ts">
import { useRouter } from "vue-router";
import Button from "primevue/button";
import { useSessionStore } from "@/stores/session";

const router = useRouter();
const session = useSessionStore();

const logout = async () => {
  await session.logout();
  await router.push({ name: "login" });
};
</script>

<template>
  <div class="app-shell">
    <aside class="app-nav" aria-label="Navegação principal">
      <div class="nav-brand">
        <span class="eyebrow">DASS</span>
        <strong>Inventário de Amostras</strong>
      </div>

      <nav class="nav-links">
        <RouterLink :to="{ name: 'inventory' }">
          <i class="pi pi-box" /> <span>Inventário</span>
        </RouterLink>
        <RouterLink :to="{ name: 'sample-create' }">
          <i class="pi pi-plus-circle" /> <span>Nova amostra</span>
        </RouterLink>
        <RouterLink :to="{ name: 'drawers' }">
          <i class="pi pi-inbox" /> <span>Gavetas</span>
        </RouterLink>
        <RouterLink :to="{ name: 'settings' }">
          <i class="pi pi-cog" /> <span>Configurações</span>
        </RouterLink>
      </nav>

      <div class="nav-user">
        <span class="nav-user-name">{{ session.user?.nome }}</span>
        <Button
          label="Sair"
          icon="pi pi-sign-out"
          severity="secondary"
          text
          @click="logout"
        />
      </div>
    </aside>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
