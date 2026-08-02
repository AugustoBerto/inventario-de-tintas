<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AxiosError } from "axios";
import Button from "primevue/button";
import Message from "primevue/message";
import Select from "primevue/select";
import {
  addressSample,
  listDrawers,
  moveSample,
  removeSampleAddress,
} from "@/services/samples";
import type { DrawerSummary, Sample } from "@/types/sample";

const props = defineProps<{ sample: Sample }>();
const emit = defineEmits<{ updated: [sample: Sample] }>();
const drawers = ref<DrawerSummary[]>([]);
const destinationId = ref<string | null>(null);
const loading = ref(false);
const errorMessage = ref("");

const drawerOptions = computed(() =>
  drawers.value.map((drawer) => ({
    label: `${drawer.type === "BASE_AGUA" ? "Base água" : "Solvente"} ${drawer.number} — ${drawer.occupied}/${drawer.capacity}`,
    value: drawer.id,
    disabled: drawer.available === 0 && drawer.id !== props.sample.drawerId,
  })),
);

const run = async (operation: () => Promise<Sample>) => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const sample = await operation();
    emit("updated", sample);
    drawers.value = await listDrawers();
    destinationId.value = null;
  } catch (error) {
    errorMessage.value =
      (error as AxiosError<{ message?: string }>).response?.data.message ??
      "Não foi possível atualizar o endereço.";
  } finally {
    loading.value = false;
  }
};

const move = () => {
  if (!destinationId.value) return;
  const divergent =
    props.sample.recommendation &&
    props.sample.recommendation.id !== destinationId.value;
  if (
    divergent &&
    !window.confirm(
      "A gaveta selecionada difere da recomendação. Deseja continuar?",
    )
  ) {
    return;
  }
  const reason = divergent
    ? (window.prompt("Motivo da divergência (opcional):") ?? undefined)
    : undefined;
  void run(() =>
    moveSample(
      props.sample.id,
      destinationId.value!,
      Boolean(divergent),
      reason,
    ),
  );
};

onMounted(async () => {
  try {
    drawers.value = await listDrawers();
  } catch {
    errorMessage.value = "Não foi possível carregar as gavetas.";
  }
});
</script>

<template>
  <section class="address-panel">
    <h3>Endereçamento</h3>
    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <div class="address-summary">
      <div>
        <span>Endereço atual</span>
        <strong v-if="sample.drawer">
          {{ sample.drawer.type === "BASE_AGUA" ? "Base água" : "Solvente" }}
          {{ sample.drawer.number }}
        </strong>
        <strong v-else>Sem endereço</strong>
      </div>
      <div>
        <span>Recomendação</span>
        <strong v-if="sample.recommendation">
          {{
            sample.recommendation.type === "BASE_AGUA"
              ? "Base água"
              : "Solvente"
          }}
          {{ sample.recommendation.number }}
          ({{ sample.recommendation.occupied }}/{{
            sample.recommendation.capacity
          }})
        </strong>
        <strong v-else>Sem recomendação</strong>
      </div>
      <div>
        <span>Situação</span>
        <strong>{{ sample.status.replaceAll("_", " ") }}</strong>
      </div>
    </div>

    <div class="address-actions">
      <Button
        v-if="
          sample.recommendation && sample.drawerId !== sample.recommendation.id
        "
        :label="
          sample.drawerId ? 'Mover para recomendação' : 'Usar recomendação'
        "
        icon="pi pi-map-marker"
        :loading="loading"
        :disabled="sample.recommendation.available === 0"
        @click="run(() => addressSample(sample.id))"
      />
      <Button
        v-if="sample.drawerId"
        label="Remover endereço"
        icon="pi pi-times"
        severity="secondary"
        outlined
        :loading="loading"
        @click="run(() => removeSampleAddress(sample.id))"
      />
    </div>

    <div class="move-form">
      <Select
        v-model="destinationId"
        :options="drawerOptions"
        option-label="label"
        option-value="value"
        option-disabled="disabled"
        placeholder="Selecionar outra gaveta"
        filter
      />
      <Button
        label="Mover"
        icon="pi pi-arrow-right"
        :disabled="!destinationId"
        :loading="loading"
        @click="move"
      />
    </div>

    <small v-if="sample.divergenceReason">
      Motivo da divergência: {{ sample.divergenceReason }}
    </small>
  </section>
</template>
