<script setup lang="ts">
import { ref } from "vue";
import SampleForm from "@/components/SampleForm.vue";
import SampleSuccessPopup from "@/components/SampleSuccessPopup.vue";
import type { Sample } from "@/types/sample";

const latestSavedSample = ref<Sample | null>(null);

const saved = (sample: Sample) => {
  latestSavedSample.value = sample;
};
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Cadastro</span>
    <h1>Nova amostra</h1>
    <p class="subtitle">
      A referência será normalizada para maiúsculas e não poderá ser alterada.
    </p>

    <SampleSuccessPopup
      :sample="latestSavedSample"
      @close="latestSavedSample = null"
    />

    <div class="content-card">
      <SampleForm @saved="saved" />
    </div>
  </section>
</template>
