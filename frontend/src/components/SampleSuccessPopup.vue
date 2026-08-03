<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import { formatDrawerLabel, type Sample } from "@/types/sample";

const props = defineProps<{
  sample: Sample | null;
  duration?: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const visible = ref(false);
const remainingPercent = ref(100);
let timer: ReturnType<typeof setTimeout> | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

const startAutoClose = (durationMs = 4000) => {
  clearTimers();
  remainingPercent.value = 100;
  visible.value = true;

  const startTime = Date.now();
  interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    remainingPercent.value = Math.max(0, 100 - (elapsed / durationMs) * 100);
  }, 30);

  timer = setTimeout(() => {
    dismiss();
  }, durationMs);
};

const clearTimers = () => {
  if (timer) clearTimeout(timer);
  if (interval) clearInterval(interval);
  timer = null;
  interval = null;
};

const dismiss = () => {
  clearTimers();
  visible.value = false;
  emit("close");
};

const goToInventory = () => {
  if (!props.sample) return;
  const ref = props.sample.reference;
  dismiss();
  void router.push({ name: "inventory", query: { search: ref } });
};

watch(
  () => props.sample,
  (newSample) => {
    if (newSample) {
      startAutoClose(props.duration ?? 4000);
    } else {
      dismiss();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  clearTimers();
});
</script>

<template>
  <Transition name="popup-slide">
    <div v-if="visible && sample" class="success-popup-card" role="alert">
      <div class="popup-header">
        <div class="popup-icon-badge">
          <i class="pi pi-check-circle" />
        </div>
        <div class="popup-title-area">
          <h3>Amostra Cadastrada!</h3>
          <span class="ref-tag">{{ sample.reference }}</span>
        </div>
        <button class="popup-close-btn" aria-label="Fechar" @click="dismiss">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="popup-body">
        <div class="popup-meta-grid">
          <div v-if="sample.drawer" class="meta-item">
            <span class="meta-label">Endereço</span>
            <strong class="meta-value">
              📍 {{ formatDrawerLabel(sample.drawer) }}
            </strong>
          </div>
          <div v-else class="meta-item">
            <span class="meta-label">Endereço</span>
            <span class="meta-muted">Sem endereço</span>
          </div>

          <div v-if="sample.color" class="meta-item">
            <span class="meta-label">Cor</span>
            <strong class="meta-value">{{ sample.color }}</strong>
          </div>

          <div v-if="sample.supplier" class="meta-item">
            <span class="meta-label">Fornecedor</span>
            <strong class="meta-value">{{ sample.supplier }}</strong>
          </div>
        </div>

        <div class="popup-actions">
          <Button
            label="Ver no inventário"
            icon="pi pi-external-link"
            size="small"
            severity="secondary"
            text
            @click="goToInventory"
          />
        </div>
      </div>

      <!-- Auto close progress bar -->
      <div class="popup-progress-track">
        <div
          class="popup-progress-fill"
          :style="{ width: `${remainingPercent}%` }"
        />
      </div>
    </div>
  </Transition>
</template>
