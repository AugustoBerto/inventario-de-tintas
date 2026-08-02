<script setup lang="ts">
import { ref } from "vue";
import Message from "primevue/message";
import SampleForm from "@/components/SampleForm.vue";
import type { Sample } from "@/types/sample";

const savedReference = ref("");

const saved = (sample: Sample) => {
  savedReference.value = sample.reference;
};
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Cadastro</span>
    <h1>Nova amostra</h1>
    <p class="subtitle">
      A referência será normalizada para maiúsculas e não poderá ser alterada.
    </p>
    <Message v-if="savedReference" severity="success">
      Amostra {{ savedReference }} cadastrada.
    </Message>
    <div class="content-card">
      <SampleForm @saved="saved" />
    </div>
  </section>
</template>
