<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    severity?: "info" | "warn" | "danger" | "success";
    loading?: boolean;
  }>(),
  {
    title: "Confirmação",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
    severity: "info",
    loading: false,
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  confirm: [];
  cancel: [];
}>();

const close = () => {
  if (props.loading) return;
  emit("update:visible", false);
  emit("cancel");
};

const handleConfirm = () => {
  emit("confirm");
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :style="{ width: '90%', maxWidth: '440px' }"
    :closable="!loading"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="confirm-modal-body">
      <div :class="['confirm-icon-wrapper', severity]">
        <i
          :class="[
            'pi',
            severity === 'danger'
              ? 'pi-exclamation-triangle'
              : severity === 'warn'
                ? 'pi-exclamation-circle'
                : 'pi-info-circle',
          ]"
        />
      </div>
      <p class="confirm-message">{{ message }}</p>
    </div>

    <template #footer>
      <div class="confirm-modal-actions">
        <Button
          :label="cancelLabel"
          severity="secondary"
          text
          :disabled="loading"
          @click="close"
        />
        <Button
          :label="confirmLabel"
          :severity="severity === 'danger' ? 'danger' : 'primary'"
          :loading="loading"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>
