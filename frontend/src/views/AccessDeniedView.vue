<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import { useSessionStore } from "@/stores/session";

const session = useSessionStore();
const router = useRouter();
const loading = ref(false);

const retry = async () => {
  loading.value = true;
  await session.restore();
  if (session.access) await router.push({ name: "inventory" });
  loading.value = false;
};
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <span class="eyebrow">Inventário</span>
      <h1>Acesso negado</h1>
      <p>Seu usuário corporativo não possui acesso ativo a esta aplicação.</p>
      <Button label="Tentar novamente" icon="pi pi-refresh" :loading="loading" @click="retry" />
    </section>
  </main>
</template>
