<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import ProgressSpinner from "primevue/progressspinner";
import { listDrawers } from "@/services/samples";
import { getSettings } from "@/services/admin";
import type { DrawerSummary } from "@/types/sample";

const drawers = ref<DrawerSummary[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const alertPercent = ref(80);
const solvent = computed(() => drawers.value.filter((item) => item.type === "SOLVENTE"));
const water = computed(() => drawers.value.filter((item) => item.type === "BASE_AGUA"));

const load = async () => {
  try {
    drawers.value = await listDrawers();
  } catch {
    errorMessage.value = "Não foi possível carregar a ocupação das gavetas.";
  } finally {
    loading.value = false;
  }
};

onMounted(load);
onMounted(async () => {
  try {
    alertPercent.value = (await getSettings()).capacityAlertPercent;
  } catch {
    // A ocupação continua disponível mesmo sem a configuração.
  }
});
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Checkpoint 4</span>
    <h1>Gavetas</h1>
    <p class="subtitle">Ocupação das fileiras de solvente e base água.</p>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>
    <div v-if="loading" class="loading-state"><ProgressSpinner /></div>
    <template v-else>
      <section class="drawer-row">
        <h2>Solvente</h2>
        <div class="drawer-grid">
          <article
            v-for="drawer in solvent"
            :key="drawer.id"
            :class="['drawer-card', { 'capacity-warning': drawer.occupied / drawer.capacity * 100 >= alertPercent }]"
          >
            <strong>Gaveta {{ drawer.number }}</strong>
            <span>{{ drawer.occupied }} de {{ drawer.capacity }}</span>
            <ProgressBar :value="(drawer.occupied / drawer.capacity) * 100" />
          </article>
        </div>
      </section>
      <section class="drawer-row">
        <h2>Base água</h2>
        <div class="drawer-grid">
          <article
            v-for="drawer in water"
            :key="drawer.id"
            :class="['drawer-card', { 'capacity-warning': drawer.occupied / drawer.capacity * 100 >= alertPercent }]"
          >
            <strong>Gaveta {{ drawer.number }}</strong>
            <span>{{ drawer.occupied }} de {{ drawer.capacity }}</span>
            <ProgressBar :value="(drawer.occupied / drawer.capacity) * 100" />
          </article>
        </div>
      </section>
    </template>
  </section>
</template>
