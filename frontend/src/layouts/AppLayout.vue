<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import { useSessionStore } from "@/stores/session";

const router = useRouter();
const route = useRoute();
const session = useSessionStore();
const mobileMenuOpen = ref(false);

const logout = async () => {
  mobileMenuOpen.value = false;
  await session.logout();
  await router.push({ name: "login" });
};

watch(
  () => route.path,
  () => {
    mobileMenuOpen.value = false;
  },
);
</script>

<template>
  <div class="app-shell">
    <!-- Desktop Sidebar Navigation -->
    <aside class="app-nav desktop-nav" aria-label="Navegação principal">
      <div class="nav-brand">
        <span class="eyebrow">DASS</span>
        <strong>Inventário de Amostras</strong>
      </div>

      <nav class="nav-links">
        <RouterLink :to="{ name: 'inventory' }">
          <i class="pi pi-box" /> <span>Inventário</span>
        </RouterLink>
        <RouterLink v-if="session.canWrite" :to="{ name: 'sample-create' }">
          <i class="pi pi-plus-circle" /> <span>Nova amostra</span>
        </RouterLink>
        <RouterLink :to="{ name: 'drawers' }">
          <i class="pi pi-inbox" /> <span>Gavetas</span>
        </RouterLink>
        <RouterLink v-if="session.isAdmin" :to="{ name: 'settings' }">
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

    <!-- Floating Mobile Menu Button -->
    <Button
      icon="pi pi-bars"
      class="floating-menu-btn"
      aria-label="Abrir menu principal"
      rounded
      @click="mobileMenuOpen = true"
    />

    <!-- Mobile Navigation Drawer -->
    <Drawer
      v-model:visible="mobileMenuOpen"
      position="left"
      class="mobile-nav-drawer"
    >
      <template #header>
        <div class="nav-brand">
          <span class="eyebrow">DASS</span>
          <strong>Inventário de Amostras</strong>
        </div>
      </template>

      <div class="mobile-drawer-content">
        <nav class="nav-links mobile">
          <RouterLink :to="{ name: 'inventory' }">
            <i class="pi pi-box" /> <span>Inventário</span>
          </RouterLink>
          <RouterLink v-if="session.canWrite" :to="{ name: 'sample-create' }">
            <i class="pi pi-plus-circle" /> <span>Nova amostra</span>
          </RouterLink>
          <RouterLink :to="{ name: 'drawers' }">
            <i class="pi pi-inbox" /> <span>Gavetas</span>
          </RouterLink>
          <RouterLink v-if="session.isAdmin" :to="{ name: 'settings' }">
            <i class="pi pi-cog" /> <span>Configurações</span>
          </RouterLink>
        </nav>

        <div class="nav-user mobile">
          <div class="user-info">
            <i class="pi pi-user" />
            <span class="nav-user-name">{{ session.user?.nome }}</span>
          </div>
          <Button
            label="Sair da conta"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            @click="logout"
          />
        </div>
      </div>
    </Drawer>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
