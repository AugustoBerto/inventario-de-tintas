<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import SampleAddressing from "@/components/SampleAddressing.vue";
import SampleForm from "@/components/SampleForm.vue";
import { getSample, listSamples } from "@/services/samples";
import type { Sample } from "@/types/sample";

const route = useRoute();
const router = useRouter();
const samples = ref<Sample[]>([]);
const selected = ref<Sample | null>(null);
const detailVisible = ref(false);
const editing = ref(false);
const loading = ref(true);
const errorMessage = ref("");
const search = ref("");
const page = ref(1);
const limit = 10;
const total = ref(0);
const totalPages = ref(1);
const order = ref<"ASC" | "DESC">("ASC");
const orderOptions = [
  { label: "Referência A–Z", value: "ASC" },
  { label: "Referência Z–A", value: "DESC" },
];
const createdReference = computed(() =>
  typeof route.query.created === "string" ? route.query.created : "",
);

const load = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await listSamples({
      page: page.value,
      limit,
      search: search.value,
      order: order.value,
    });
    samples.value = response.items;
    total.value = response.pagination.total;
    totalPages.value = response.pagination.totalPages;
  } catch {
    errorMessage.value = "Não foi possível carregar o inventário.";
  } finally {
    loading.value = false;
  }
};

const submitSearch = () => {
  page.value = 1;
  void load();
};

const changePage = (nextPage: number) => {
  page.value = nextPage;
  void load();
};

const openDetail = async (sample: Sample) => {
  selected.value = sample;
  detailVisible.value = true;
  editing.value = false;
  try {
    selected.value = await getSample(sample.id);
  } catch {
    errorMessage.value = "Não foi possível carregar os detalhes da amostra.";
  }
};

const sampleSaved = (sample: Sample) => {
  selected.value = sample;
  editing.value = false;
  const index = samples.value.findIndex((item) => item.id === sample.id);
  if (index >= 0) samples.value[index] = sample;
};

const sampleAddressUpdated = (sample: Sample) => {
  sampleSaved(sample);
};

const clearCreatedMessage = async () => {
  await router.replace({ query: {} });
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value)) : "—";

onMounted(load);
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Checkpoint 2</span>
    <div class="page-heading">
      <div>
        <h1>Inventário</h1>
        <p class="subtitle">{{ total }} amostra(s) cadastrada(s).</p>
      </div>
      <Button
        label="Nova amostra"
        icon="pi pi-plus"
        @click="router.push({ name: 'sample-create' })"
      />
    </div>

    <Message
      v-if="createdReference"
      severity="success"
      closable
      @close="clearCreatedMessage"
    >
      Amostra {{ createdReference }} cadastrada com sucesso.
    </Message>
    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <div class="inventory-toolbar">
      <form class="search-form" @submit.prevent="submitSearch">
        <InputText
          v-model="search"
          placeholder="Pesquisar por referência"
          aria-label="Pesquisar por referência"
        />
        <Button type="submit" label="Pesquisar" icon="pi pi-search" />
      </form>
      <Select
        v-model="order"
        :options="orderOptions"
        option-label="label"
        option-value="value"
        aria-label="Ordenar amostras"
        @change="submitSearch"
      />
    </div>

    <div class="content-card table-card">
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
      </div>
      <div v-else-if="samples.length === 0" class="empty-state">
        Nenhuma amostra encontrada.
      </div>
      <div v-else class="table-scroll">
        <table class="samples-table">
          <thead>
            <tr>
              <th>Referência</th>
              <th>Cor</th>
              <th>Fornecedor</th>
              <th>Base Produto</th>
              <th>VOC</th>
              <th>Data da amostra</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="sample in samples"
              :key="sample.id"
              tabindex="0"
              @click="openDetail(sample)"
              @keydown.enter="openDetail(sample)"
            >
              <td><strong>{{ sample.reference }}</strong></td>
              <td>{{ sample.color || "—" }}</td>
              <td>{{ sample.supplier || "—" }}</td>
              <td>{{ sample.productBase || "—" }}</td>
              <td>{{ sample.voc || "—" }}</td>
              <td>{{ formatDate(sample.sampleDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <Button
          icon="pi pi-chevron-left"
          severity="secondary"
          text
          aria-label="Página anterior"
          :disabled="page === 1"
          @click="changePage(page - 1)"
        />
        <span>Página {{ page }} de {{ totalPages }}</span>
        <Button
          icon="pi pi-chevron-right"
          severity="secondary"
          text
          aria-label="Próxima página"
          :disabled="page >= totalPages"
          @click="changePage(page + 1)"
        />
      </div>
    </div>

    <Drawer
      v-model:visible="detailVisible"
      position="right"
      class="sample-drawer"
      header="Detalhes da amostra"
    >
      <template v-if="selected">
        <SampleForm v-if="editing" :sample="selected" @saved="sampleSaved" />
        <div v-else class="sample-details">
          <div class="detail-heading">
            <div>
              <span class="eyebrow">Referência</span>
              <h2>{{ selected.reference }}</h2>
            </div>
            <Button label="Editar" icon="pi pi-pencil" outlined @click="editing = true" />
          </div>
          <dl>
            <div><dt>Cor</dt><dd>{{ selected.color || "—" }}</dd></div>
            <div><dt>Fornecedor</dt><dd>{{ selected.supplier || "—" }}</dd></div>
            <div><dt>Base Produto</dt><dd>{{ selected.productBase || "—" }}</dd></div>
            <div><dt>VOC</dt><dd>{{ selected.voc || "—" }}</dd></div>
            <div><dt>Data da amostra</dt><dd>{{ formatDate(selected.sampleDate) }}</dd></div>
            <div><dt>Fabricação</dt><dd>{{ formatDate(selected.manufacturedAt) }}</dd></div>
            <div><dt>Validade</dt><dd>{{ formatDate(selected.expiresAt) }}</dd></div>
            <div><dt>Substrato</dt><dd>{{ selected.substrate || "—" }}</dd></div>
            <div><dt>Aplicação</dt><dd>{{ selected.paintApplication || "—" }}</dd></div>
            <div><dt>Marca</dt><dd>{{ selected.brand || "—" }}</dd></div>
            <div><dt>Demão</dt><dd>{{ selected.coat || "—" }}</dd></div>
            <div><dt>Status</dt><dd>{{ selected.status }}</dd></div>
          </dl>
          <div>
            <strong>Observações</strong>
            <p>{{ selected.notes || "Nenhuma observação." }}</p>
          </div>
          <SampleAddressing
            :sample="selected"
            @updated="sampleAddressUpdated"
          />
        </div>
      </template>
    </Drawer>
  </section>
</template>
