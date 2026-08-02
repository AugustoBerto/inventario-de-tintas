<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputNumber from "primevue/inputnumber";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import ProgressSpinner from "primevue/progressspinner";
import { listDrawers, listSamples, updateDrawerCapacity } from "@/services/samples";
import { getSettings } from "@/services/admin";
import type { DrawerSummary, Sample } from "@/types/sample";

const drawers = ref<DrawerSummary[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const alertPercent = ref(80);
const maxCapacityLimit = ref(100);

const selectedDrawer = ref<DrawerSummary | null>(null);
const detailVisible = ref(false);
const drawerSamples = ref<Sample[]>([]);
const loadingSamples = ref(false);
const samplesError = ref("");

const editingCapacity = ref(false);
const newCapacityInput = ref(0);
const savingCapacity = ref(false);
const capacityMessage = ref("");
const capacityError = ref("");

const solvent = computed(() =>
  drawers.value.filter((item) => item.type === "SOLVENTE"),
);
const water = computed(() =>
  drawers.value.filter((item) => item.type === "BASE_AGUA"),
);

const load = async () => {
  try {
    drawers.value = await listDrawers();
  } catch {
    errorMessage.value = "Não foi possível carregar a ocupação das gavetas.";
  } finally {
    loading.value = false;
  }
};

const openDrawer = async (drawer: DrawerSummary) => {
  selectedDrawer.value = drawer;
  newCapacityInput.value = drawer.capacity;
  editingCapacity.value = false;
  capacityMessage.value = "";
  capacityError.value = "";
  detailVisible.value = true;
  loadingSamples.value = true;
  samplesError.value = "";
  try {
    const res = await listSamples({ drawerId: drawer.id, limit: 100, page: 1 });
    drawerSamples.value = res.items;
  } catch {
    samplesError.value = "Não foi possível carregar as amostras desta gaveta.";
  } finally {
    loadingSamples.value = false;
  }
};

const saveDrawerCapacity = async () => {
  if (!selectedDrawer.value) return;
  savingCapacity.value = true;
  capacityError.value = "";
  capacityMessage.value = "";
  try {
    const updated = await updateDrawerCapacity(
      selectedDrawer.value.id,
      newCapacityInput.value,
    );
    selectedDrawer.value = updated;
    const idx = drawers.value.findIndex((d) => d.id === updated.id);
    if (idx !== -1) {
      drawers.value[idx] = updated;
    }
    capacityMessage.value = "Capacidade atualizada com sucesso.";
    editingCapacity.value = false;
  } catch (err: any) {
    capacityError.value =
      err?.response?.data?.message ?? "Não foi possível atualizar a capacidade.";
  } finally {
    savingCapacity.value = false;
  }
};

onMounted(load);
onMounted(async () => {
  try {
    const settings = await getSettings();
    alertPercent.value = settings.capacityAlertPercent;
    maxCapacityLimit.value = settings.maxDrawerCapacity;
  } catch {
    // A ocupação continua disponível mesmo sem a configuração.
  }
});
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Armazenamento</span>
    <h1>Gavetas</h1>
    <p class="subtitle">
      Ocupação das fileiras de solvente e base água. Clique em uma gaveta para ver detalhes e amostras.
    </p>

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
            :class="[
              'drawer-card',
              'interactive-card',
              {
                'capacity-warning':
                  (drawer.occupied / drawer.capacity) * 100 >= alertPercent,
              },
            ]"
            role="button"
            tabindex="0"
            @click="openDrawer(drawer)"
            @keydown.enter="openDrawer(drawer)"
          >
            <div class="drawer-card-header">
              <strong>Gaveta {{ drawer.number }}</strong>
              <i class="pi pi-chevron-right card-arrow" />
            </div>
            <div class="drawer-card-info">
              <span class="count">{{ drawer.occupied }} amostra(s)</span>
            </div>
            <ProgressBar
              :value="(drawer.occupied / drawer.capacity) * 100"
              :show-value="false"
            />
          </article>
        </div>
      </section>
      <section class="drawer-row">
        <h2>Base água</h2>
        <div class="drawer-grid">
          <article
            v-for="drawer in water"
            :key="drawer.id"
            :class="[
              'drawer-card',
              'interactive-card',
              {
                'capacity-warning':
                  (drawer.occupied / drawer.capacity) * 100 >= alertPercent,
              },
            ]"
            role="button"
            tabindex="0"
            @click="openDrawer(drawer)"
            @keydown.enter="openDrawer(drawer)"
          >
            <div class="drawer-card-header">
              <strong>Gaveta {{ drawer.number }}</strong>
              <i class="pi pi-chevron-right card-arrow" />
            </div>
            <div class="drawer-card-info">
              <span class="count">{{ drawer.occupied }} amostra(s)</span>
            </div>
            <ProgressBar
              :value="(drawer.occupied / drawer.capacity) * 100"
              :show-value="false"
            />
          </article>
        </div>
      </section>

      <Drawer
        v-model:visible="detailVisible"
        position="right"
        class="sample-drawer drawer-detail-modal"
        header="Detalhes da Gaveta"
      >
        <template v-if="selectedDrawer">
          <div class="drawer-detail-content">
            <div class="drawer-summary-box">
              <span class="eyebrow">
                {{ selectedDrawer.type === 'BASE_AGUA' ? 'Base água' : 'Solvente' }}
              </span>
              <h2>Gaveta {{ selectedDrawer.number }}</h2>

              <div class="drawer-metrics-grid">
                <div class="metric-card">
                  <span class="metric-label">Amostras</span>
                  <span class="metric-value">{{ selectedDrawer.occupied }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Capacidade</span>
                  <span class="metric-value">{{ selectedDrawer.capacity }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Livres</span>
                  <span class="metric-value">{{ selectedDrawer.available }}</span>
                </div>
              </div>

              <div class="capacity-bar-container">
                <div class="capacity-bar-label">
                  <span>Ocupação atual</span>
                  <strong>{{ Math.round((selectedDrawer.occupied / selectedDrawer.capacity) * 100) }}%</strong>
                </div>
                <ProgressBar
                  :value="(selectedDrawer.occupied / selectedDrawer.capacity) * 100"
                />
              </div>

              <div class="capacity-edit-section">
                <div v-if="!editingCapacity" class="capacity-view-row">
                  <Button
                    label="Alterar capacidade desta gaveta"
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    size="small"
                    @click="editingCapacity = true"
                  />
                </div>
                <div v-else class="capacity-form-row">
                  <label class="capacity-input-label">
                    Nova capacidade:
                    <InputNumber
                      v-model="newCapacityInput"
                      :min="1"
                      :max="maxCapacityLimit"
                    />
                  </label>
                  <div class="capacity-actions">
                    <Button
                      label="Salvar"
                      icon="pi pi-check"
                      size="small"
                      :loading="savingCapacity"
                      @click="saveDrawerCapacity"
                    />
                    <Button
                      label="Cancelar"
                      icon="pi pi-times"
                      severity="secondary"
                      text
                      size="small"
                      @click="editingCapacity = false"
                    />
                  </div>
                </div>
                <Message v-if="capacityMessage" severity="success" closable @close="capacityMessage = ''">
                  {{ capacityMessage }}
                </Message>
                <Message v-if="capacityError" severity="error" closable @close="capacityError = ''">
                  {{ capacityError }}
                </Message>
              </div>

              <RouterLink
                :to="{ name: 'inventory', query: { drawerId: selectedDrawer.id } }"
                class="view-inventory-link"
              >
                <Button
                  label="Ver no inventário completo"
                  icon="pi pi-external-link"
                  severity="secondary"
                  outlined
                  size="small"
                />
              </RouterLink>
            </div>

            <section class="drawer-samples-section">
              <h3>Amostras armazenadas ({{ drawerSamples.length }})</h3>

              <div v-if="loadingSamples" class="loading-state">
                <ProgressSpinner style="width: 32px; height: 32px" />
              </div>

              <Message v-else-if="samplesError" severity="error" :closable="false">
                {{ samplesError }}
              </Message>

              <div v-else-if="drawerSamples.length === 0" class="empty-state">
                Nenhuma amostra nesta gaveta.
              </div>

              <div v-else class="drawer-samples-list">
                <article
                  v-for="sample in drawerSamples"
                  :key="sample.id"
                  class="drawer-sample-item"
                >
                  <div class="sample-item-header">
                    <RouterLink
                      :to="{ name: 'inventory', query: { search: sample.reference } }"
                      class="sample-ref-link"
                    >
                      <strong>{{ sample.reference }}</strong>
                    </RouterLink>
                    <span class="sample-status-badge">
                      {{ sample.status }}
                    </span>
                  </div>

                  <div class="sample-item-details">
                    <span v-if="sample.color">🎨 {{ sample.color }}</span>
                    <span v-if="sample.supplier">🏭 {{ sample.supplier }}</span>
                    <span v-if="sample.brand">🏷️ {{ sample.brand }}</span>
                    <span v-if="sample.expiresAt">📅 Validade: {{ sample.expiresAt }}</span>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </template>
      </Drawer>
    </template>
  </section>
</template>
