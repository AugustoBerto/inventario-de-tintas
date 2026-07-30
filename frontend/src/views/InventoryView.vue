<script setup lang="ts">
import { onMounted, ref } from "vue";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
import { http } from "@/services/http";

type State = "loading" | "online" | "offline";

const backend = ref<State>("loading");
const database = ref<State>("loading");

onMounted(async () => {
  try {
    await http.get("/inventory/health");
    backend.value = "online";
  } catch {
    backend.value = "offline";
  }

  try {
    await http.get("/inventory/health/database");
    database.value = "online";
  } catch {
    database.value = "offline";
  }
});
</script>

<template>
  <section>
    <span class="eyebrow">Checkpoint 0</span>
    <h1>Fundação técnica</h1>
    <p class="subtitle">Estado dos componentes da aplicação.</p>

    <div class="status-grid">
      <article class="status-card">
        <i class="pi pi-desktop" />
        <div><strong>Frontend</strong><span class="online">disponível</span></div>
      </article>
      <article class="status-card">
        <i class="pi pi-server" />
        <div>
          <strong>Backend</strong>
          <ProgressSpinner v-if="backend === 'loading'" />
          <span v-else :class="backend">{{ backend }}</span>
        </div>
      </article>
      <article class="status-card">
        <i class="pi pi-database" />
        <div>
          <strong>Banco de dados</strong>
          <ProgressSpinner v-if="database === 'loading'" />
          <span v-else :class="database">{{ database }}</span>
        </div>
      </article>
      <article class="status-card">
        <i class="pi pi-share-alt" />
        <div>
          <strong>Gateway</strong>
          <span :class="backend">{{ backend === "online" ? "acessível" : backend }}</span>
        </div>
      </article>
    </div>

    <Message severity="info" :closable="false">
      A consulta e o cadastro de amostras serão entregues nos próximos checkpoints.
    </Message>
  </section>
</template>

