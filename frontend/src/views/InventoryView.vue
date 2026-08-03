<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import SampleAddressing from "@/components/SampleAddressing.vue";
import SampleForm from "@/components/SampleForm.vue";
import AppConfirmModal from "@/components/AppConfirmModal.vue";
import {
  getSample,
  getSampleMovements,
  listDrawers,
  listSamples,
  runBatch,
  type BatchAction,
} from "@/services/samples";
import { useSessionStore } from "@/stores/session";
import type {
  DrawerSummary,
  Sample,
  SampleFilters,
  SampleMovement,
} from "@/types/sample";
import { formatDrawerLabel } from "@/types/sample";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const samples = ref<Sample[]>([]);
const drawers = ref<DrawerSummary[]>([]);
const movements = ref<SampleMovement[]>([]);
const selected = ref<Sample | null>(null);
const selectedIds = ref<string[]>([]);
const detailVisible = ref(false);
const filtersVisible = ref(false);
const editing = ref(false);
const loading = ref(true);
const batchLoading = ref(false);
const errorMessage = ref("");
const resultMessage = ref("");
const batchResultDetails = ref("");
const confirmModalVisible = ref(false);
const confirmModalTitle = ref("Confirmação de Ação em Lote");
const confirmModalMessage = ref("");
const confirmModalSeverity = ref<"info" | "warn" | "danger">("info");
const confirmModalConfirmLabel = ref("Confirmar");
const page = ref(Number(route.query.page) || 1);
const limit = 10;
const total = ref(0);
const totalPages = ref(1);
const counters = reactive({
  total: 0,
  withoutAddress: 0,
  expired: 0,
  expiring: 0,
});
const filters = reactive<Record<string, string>>({
  search: String(route.query.search ?? ""),
  color: String(route.query.color ?? ""),
  supplier: String(route.query.supplier ?? ""),
  brand: String(route.query.brand ?? ""),
  productBase: String(route.query.productBase ?? ""),
  substrate: String(route.query.substrate ?? ""),
  voc: String(route.query.voc ?? ""),
  paintApplication: String(route.query.paintApplication ?? ""),
  coat: String(route.query.coat ?? ""),
  expiresAt: String(route.query.expiresAt ?? ""),
  expirationStatus: String(route.query.expirationStatus ?? ""),
  drawerId: String(route.query.drawerId ?? ""),
  status: String(route.query.status ?? ""),
  createdDate: String(route.query.createdDate ?? ""),
  sort: String(route.query.sort ?? "reference"),
  order: String(route.query.order ?? "ASC"),
});
const batchAction = ref<BatchAction>("move-to-recommended");
const batchDrawerId = ref("");
const expirationOptions = [
  { label: "Sem validade", value: "SEM_VALIDADE" },
  { label: "Válida", value: "VALIDA" },
  { label: "Próxima do vencimento", value: "PROXIMA" },
  { label: "Vencida", value: "VENCIDA" },
];
const addressOptions = [
  { label: "Endereçado", value: "CORRETO" },
  { label: "Divergente", value: "DIVERGENTE" },
  { label: "Sem endereço", value: "SEM_ENDERECO" },
];
const sortOptions = [
  { label: "Referência A–Z", value: "reference:ASC" },
  { label: "Referência Z–A", value: "reference:DESC" },
  { label: "Validade mais próxima", value: "expiresAt:ASC" },
  { label: "Cadastro mais recente", value: "createdAt:DESC" },
];
const sortValue = computed({
  get: () => `${filters.sort}:${filters.order}`,
  set: (value: string) => {
    const [sort, order] = value.split(":");
    filters.sort = sort;
    filters.order = order;
  },
});
const allPageSelected = computed(
  () =>
    samples.value.length > 0 &&
    samples.value.every((item) => selectedIds.value.includes(item.id)),
);
const drawerOptions = computed(() =>
  drawers.value.map((drawer) => ({
    label: formatDrawerLabel(drawer),
    value: drawer.id,
  })),
);

const queryFilters = (): SampleFilters => ({
  page: page.value,
  limit,
  ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  order: filters.order as "ASC" | "DESC",
});

const syncUrl = () =>
  router.replace({
    query: {
      ...Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value),
      ),
      ...(page.value > 1 ? { page: String(page.value) } : {}),
    },
  });

const load = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const response = await listSamples(queryFilters());
    samples.value = response.items;
    total.value = response.pagination.total;
    totalPages.value = response.pagination.totalPages;
    Object.assign(counters, response.counters);
  } catch {
    errorMessage.value = "Não foi possível carregar o inventário.";
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  selectedIds.value = [];
  await syncUrl();
  await load();
};

const clearFilters = async () => {
  for (const key of Object.keys(filters)) filters[key] = "";
  filters.sort = "reference";
  filters.order = "ASC";
  await applyFilters();
};

const changePage = async (nextPage: number) => {
  page.value = nextPage;
  selectedIds.value = [];
  await syncUrl();
  await load();
};

const openDetail = async (sample: Sample) => {
  selected.value = sample;
  detailVisible.value = true;
  editing.value = false;
  try {
    [selected.value, movements.value] = await Promise.all([
      getSample(sample.id),
      getSampleMovements(sample.id),
    ]);
  } catch {
    errorMessage.value = "Não foi possível carregar os detalhes.";
  }
};

const formatExpirationStatus = (status?: string) => {
  switch (status) {
    case "SEM_VALIDADE":
      return "Sem validade";
    case "VALIDA":
      return "Válida";
    case "PROXIMA":
      return "Próxima do vencimento";
    case "VENCIDA":
      return "Vencida";
    default:
      return status || "—";
  }
};

const sampleUpdated = (sample: Sample) => {
  selected.value = sample;
  editing.value = false;
  const index = samples.value.findIndex((item) => item.id === sample.id);
  if (index >= 0) samples.value[index] = sample;
  void getSampleMovements(sample.id).then((items) => (movements.value = items));
  void load();
};

const togglePage = () => {
  selectedIds.value = allPageSelected.value
    ? []
    : samples.value.map((item) => item.id);
};

const executeBatch = async () => {
  errorMessage.value = "";
  if (!selectedIds.value.length) return;
  if (batchAction.value === "move" && !batchDrawerId.value) {
    errorMessage.value = "Selecione a gaveta de destino.";
    return;
  }
  batchLoading.value = true;
  try {
    const preview = await runBatch(
      batchAction.value,
      selectedIds.value,
      true,
      batchDrawerId.value || undefined,
    );
    const valid = preview.results.filter((item) => item.success).length;
    const ignored = preview.results.length - valid;

    if (!valid) {
      errorMessage.value =
        "Nenhum dos itens selecionados pode ser processado nesta ação.";
      return;
    }

    confirmModalTitle.value =
      batchAction.value === "delete"
        ? "Excluir Amostras"
        : "Confirmar Ação em Lote";
    confirmModalMessage.value =
      batchAction.value === "delete"
        ? `ATENÇÃO: ${valid} amostra(s) serão excluídas definitivamente. Esta operação não pode ser desfeita.`
        : `Prévia: ${valid} item(ns) serão processados e ${ignored} ignorado(s). Deseja continuar?`;
    confirmModalSeverity.value =
      batchAction.value === "delete" ? "danger" : "info";
    confirmModalConfirmLabel.value =
      batchAction.value === "delete" ? "Excluir" : "Processar";
    confirmModalVisible.value = true;
  } catch {
    errorMessage.value = "Não foi possível executar a ação em lote.";
  } finally {
    batchLoading.value = false;
  }
};

const confirmExecuteBatch = async () => {
  confirmModalVisible.value = false;
  batchLoading.value = true;
  try {
    if (selected.value && selectedIds.value.includes(selected.value.id)) {
      selected.value = null;
    }
    const result = await runBatch(
      batchAction.value,
      selectedIds.value,
      false,
      batchDrawerId.value || undefined,
    );
    const success = result.results.filter((item) => item.success).length;
    resultMessage.value = `${success} item(ns) processado(s); ${result.results.length - success} ignorado(s).`;
    batchResultDetails.value = result.results
      .filter((item) => !item.success)
      .map(
        (item) =>
          `${samples.value.find((sample) => sample.id === item.id)?.reference ?? item.id}: ${item.reason}`,
      )
      .join(" · ");
    selectedIds.value = [];
    await load();
  } catch {
    errorMessage.value = "Não foi possível executar a ação em lote.";
  } finally {
    batchLoading.value = false;
  }
};

const vocOptions = [
  { label: "Solvente", value: "SOLVENTE" },
  { label: "Base água", value: "BASE_AGUA" },
];

const showAdvancedFilters = ref(false);

const hasActiveFilters = computed(() =>
  Boolean(
    filters.search ||
      filters.color ||
      filters.supplier ||
      filters.brand ||
      filters.productBase ||
      filters.substrate ||
      filters.voc ||
      filters.paintApplication ||
      filters.coat ||
      filters.expirationStatus ||
      filters.drawerId ||
      filters.status,
  ),
);

const filterBySummary = (type: string) => {
  if (type === "SEM_ENDERECO") {
    filters.status = filters.status === "SEM_ENDERECO" ? "" : "SEM_ENDERECO";
    filters.expirationStatus = "";
  } else if (type === "PROXIMA") {
    filters.expirationStatus =
      filters.expirationStatus === "PROXIMA" ? "" : "PROXIMA";
    filters.status = "";
  } else if (type === "VENCIDA") {
    filters.expirationStatus =
      filters.expirationStatus === "VENCIDA" ? "" : "VENCIDA";
    filters.status = "";
  } else {
    filters.status = "";
    filters.expirationStatus = "";
  }
  page.value = 1;
  void applyFilters();
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const dateObj = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  return isNaN(dateObj.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(dateObj);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const dateObj = new Date(value);
  return isNaN(dateObj.getTime())
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(dateObj);
};

const getExpirationBadgeText = (sample: Sample) => {
  if (!sample.expiresAt || sample.expirationStatus === "SEM_VALIDADE") {
    return "Sem validade";
  }
  const dateStr = formatDate(sample.expiresAt);
  if (sample.expirationStatus === "VENCIDA") {
    return `Vencida (${dateStr})`;
  }
  if (sample.expirationStatus === "PROXIMA") {
    return `A vencer (${dateStr})`;
  }
  return `Válida (${dateStr})`;
};

const getDrawerName = (sample: Sample) => {
  if (!sample.drawer) return "Sem endereço";
  const typeName =
    sample.drawer.type === "BASE_AGUA" ? "Base água" : "Solvente";
  return `${typeName} ${sample.drawer.number}`;
};

onMounted(async () => {
  await Promise.all([
    load(),
    listDrawers().then((items) => (drawers.value = items)),
  ]);
});
</script>

<template>
  <section class="page-section">
    <div class="page-heading">
      <div>
        <span class="eyebrow">Inventário</span>
        <h1>Amostras</h1>
        <p class="subtitle">{{ total }} resultado(s) na consulta atual.</p>
      </div>
      <Button
        v-if="session.canWrite"
        label="Nova amostra"
        icon="pi pi-plus"
        @click="router.push({ name: 'sample-create' })"
      />
    </div>

    <div class="summary-grid">
      <article
        :class="[
          'interactive-card',
          { active: !filters.status && !filters.expirationStatus },
        ]"
        role="button"
        tabindex="0"
        @click="filterBySummary('')"
      >
        <span>Total</span><strong>{{ counters.total }}</strong>
      </article>

      <article
        :class="[
          'interactive-card',
          { active: filters.status === 'SEM_ENDERECO' },
        ]"
        role="button"
        tabindex="0"
        @click="filterBySummary('SEM_ENDERECO')"
      >
        <span>Sem endereço</span><strong>{{ counters.withoutAddress }}</strong>
      </article>

      <article
        :class="[
          'interactive-card',
          'warning',
          { active: filters.expirationStatus === 'PROXIMA' },
        ]"
        role="button"
        tabindex="0"
        @click="filterBySummary('PROXIMA')"
      >
        <span>Próximas</span><strong>{{ counters.expiring }}</strong>
      </article>

      <article
        :class="[
          'interactive-card',
          'danger',
          { active: filters.expirationStatus === 'VENCIDA' },
        ]"
        role="button"
        tabindex="0"
        @click="filterBySummary('VENCIDA')"
      >
        <span>Vencidas</span><strong>{{ counters.expired }}</strong>
      </article>
    </div>

    <Message
      v-if="resultMessage"
      severity="success"
      closable
      @close="resultMessage = ''"
    >
      {{ resultMessage }}
    </Message>
    <Message
      v-if="batchResultDetails"
      severity="warn"
      closable
      @close="batchResultDetails = ''"
    >
      Ignorados: {{ batchResultDetails }}
    </Message>
    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <div class="inventory-toolbar">
      <form class="search-form" @submit.prevent="applyFilters">
        <InputText
          v-model="filters.search"
          placeholder="Pesquisar referência"
        />
        <Button type="submit" label="Pesquisar" icon="pi pi-search" />
      </form>
      <div class="toolbar-actions">
        <Select
          v-model="sortValue"
          :options="sortOptions"
          option-label="label"
          option-value="value"
          @change="applyFilters"
        />
        <Button
          label="Filtros"
          icon="pi pi-filter"
          outlined
          @click="filtersVisible = !filtersVisible"
        />
      </div>
    </div>

    <div v-if="hasActiveFilters" class="active-filters-bar">
      <span class="active-filters-label">Filtros ativos:</span>
      <span
        v-if="filters.search"
        class="filter-chip"
        @click="
          filters.search = '';
          applyFilters();
        "
      >
        Busca: {{ filters.search }} ✕
      </span>
      <span
        v-if="filters.supplier"
        class="filter-chip"
        @click="
          filters.supplier = '';
          applyFilters();
        "
      >
        Fornecedor: {{ filters.supplier }} ✕
      </span>
      <span
        v-if="filters.brand"
        class="filter-chip"
        @click="
          filters.brand = '';
          applyFilters();
        "
      >
        Marca: {{ filters.brand }} ✕
      </span>
      <span
        v-if="filters.color"
        class="filter-chip"
        @click="
          filters.color = '';
          applyFilters();
        "
      >
        Cor: {{ filters.color }} ✕
      </span>
      <span
        v-if="filters.voc"
        class="filter-chip"
        @click="
          filters.voc = '';
          applyFilters();
        "
      >
        VOC: {{ filters.voc === 'BASE_AGUA' ? 'Base água' : 'Solvente' }} ✕
      </span>
      <span
        v-if="filters.drawerId"
        class="filter-chip"
        @click="
          filters.drawerId = '';
          applyFilters();
        "
      >
        Gaveta ✕
      </span>
      <span
        v-if="filters.expirationStatus"
        class="filter-chip"
        @click="
          filters.expirationStatus = '';
          applyFilters();
        "
      >
        Validade:
        {{
          expirationOptions.find((o) => o.value === filters.expirationStatus)
            ?.label || filters.expirationStatus
        }}
        ✕
      </span>
      <span
        v-if="filters.status"
        class="filter-chip"
        @click="
          filters.status = '';
          applyFilters();
        "
      >
        Endereço:
        {{
          addressOptions.find((o) => o.value === filters.status)?.label ||
          filters.status
        }}
        ✕
      </span>
      <Button
        label="Limpar todos"
        severity="secondary"
        text
        size="small"
        @click="clearFilters"
      />
    </div>

    <form
      v-if="filtersVisible"
      class="content-card filters-panel"
      @submit.prevent="applyFilters"
    >
      <InputText v-model="filters.supplier" placeholder="Fornecedor" />
      <InputText v-model="filters.brand" placeholder="Marca" />
      <InputText v-model="filters.color" placeholder="Cor" />
      <Select
        v-model="filters.voc"
        :options="vocOptions"
        option-label="label"
        option-value="value"
        placeholder="Tipo VOC"
        show-clear
      />
      <Select
        v-model="filters.drawerId"
        :options="drawerOptions"
        option-label="label"
        option-value="value"
        placeholder="Gaveta"
        show-clear
      />
      <Select
        v-model="filters.expirationStatus"
        :options="expirationOptions"
        option-label="label"
        option-value="value"
        placeholder="Situação da validade"
        show-clear
      />
      <Select
        v-model="filters.status"
        :options="addressOptions"
        option-label="label"
        option-value="value"
        placeholder="Situação do endereço"
        show-clear
      />

      <template v-if="showAdvancedFilters">
        <InputText v-model="filters.productBase" placeholder="Base Produto" />
        <InputText v-model="filters.substrate" placeholder="Substrato" />
        <InputText v-model="filters.paintApplication" placeholder="Aplicação" />
        <InputText v-model="filters.coat" placeholder="Demão" />
      </template>

      <div class="filter-actions">
        <Button
          type="button"
          :label="showAdvancedFilters ? 'Menos opções' : 'Mais opções'"
          severity="secondary"
          text
          @click="showAdvancedFilters = !showAdvancedFilters"
        />
        <Button
          type="button"
          label="Limpar"
          severity="secondary"
          text
          @click="clearFilters"
        />
        <Button type="submit" label="Aplicar filtros" />
      </div>
    </form>

    <div v-if="session.canWrite && selectedIds.length" class="batch-bar">
      <strong>{{ selectedIds.length }} selecionada(s)</strong>
      <Select
        v-model="batchAction"
        :options="[
          { label: 'Mover para gaveta', value: 'move' },
          { label: 'Remover endereço', value: 'remove-address' },
          ...(session.isAdmin
            ? [{ label: 'Excluir definitivamente', value: 'delete' }]
            : []),
        ]"
        option-label="label"
        option-value="value"
      />
      <Select
        v-if="batchAction === 'move'"
        v-model="batchDrawerId"
        :options="drawerOptions"
        option-label="label"
        option-value="value"
        placeholder="Destino"
      />
      <Button
        label="Prévia e confirmar"
        :loading="batchLoading"
        @click="executeBatch"
      />
    </div>

    <div class="content-card table-card">
      <div v-if="loading" class="loading-state"><ProgressSpinner /></div>
      <div v-else-if="samples.length === 0" class="empty-state">
        Nenhuma amostra encontrada.
      </div>
      <div v-else class="table-scroll">
        <table class="samples-table">
          <thead>
            <tr>
              <th v-if="session.canWrite">
                <input
                  type="checkbox"
                  :checked="allPageSelected"
                  @change="togglePage"
                />
              </th>
              <th>Referência</th>
              <th>Cor</th>
              <th>Fornecedor</th>
              <th>VOC</th>
              <th>Endereço</th>
              <th>Validade</th>
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
              <td v-if="session.canWrite" @click.stop>
                <input
                  v-model="selectedIds"
                  type="checkbox"
                  :value="sample.id"
                />
              </td>
              <td>
                <strong>{{ sample.reference }}</strong>
              </td>
              <td>{{ sample.color || "—" }}</td>
              <td>{{ sample.supplier || "—" }}</td>
              <td>
                {{
                  sample.voc === "BASE_AGUA" ? "Base água" : sample.voc || "—"
                }}
              </td>
              <td>
                <template v-if="sample.drawer">
                  {{ getDrawerName(sample) }}
                  <span
                    v-if="sample.status === 'DIVERGENTE'"
                    class="badge-divergent"
                  >
                    ⚠️ Divergente
                  </span>
                </template>
                <span v-else class="text-muted">Sem endereço</span>
              </td>
              <td>
                <span
                  :class="[
                    'expiration-badge',
                    sample.expirationStatus.toLowerCase(),
                  ]"
                >
                  {{ getExpirationBadgeText(sample) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <Button
          icon="pi pi-chevron-left"
          text
          :disabled="page === 1"
          @click="changePage(page - 1)"
        />
        <span>Página {{ page }} de {{ totalPages }}</span>
        <Button
          icon="pi pi-chevron-right"
          text
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
        <SampleForm v-if="editing" :sample="selected" @saved="sampleUpdated" />
        <div v-else class="sample-details">
          <div class="detail-heading">
            <div>
              <span class="eyebrow">Referência</span>
              <h2>{{ selected.reference }}</h2>
            </div>
            <Button
              v-if="session.canWrite"
              label="Editar"
              icon="pi pi-pencil"
              outlined
              @click="editing = true"
            />
          </div>
          <dl>
            <div>
              <dt>Cor</dt>
              <dd>{{ selected.color || "—" }}</dd>
            </div>
            <div>
              <dt>Fornecedor</dt>
              <dd>{{ selected.supplier || "—" }}</dd>
            </div>
            <div>
              <dt>Base Produto</dt>
              <dd>{{ selected.productBase || "—" }}</dd>
            </div>
            <div>
              <dt>VOC</dt>
              <dd>{{ selected.voc || "—" }}</dd>
            </div>
            <div>
              <dt>Validade</dt>
              <dd>
                {{ formatDate(selected.expiresAt) }} —
                {{ formatExpirationStatus(selected.expirationStatus) }}
              </dd>
            </div>
          </dl>
          <SampleAddressing
            v-if="session.canWrite"
            :sample="selected"
            @updated="sampleUpdated"
          />
          <section class="history-panel">
            <h3>Histórico</h3>
            <div v-if="!movements.length" class="empty-state compact">
              Nenhum evento registrado.
            </div>
            <article v-for="movement in movements" :key="movement.id">
              <i class="pi pi-history" />
              <div>
                <strong>{{ movement.event.replaceAll("_", " ") }}</strong>
                <span
                  >{{ formatDateTime(movement.createdAt) }} ·
                  {{ movement.actorRegistration || movement.actorId }}</span
                >
              </div>
            </article>
          </section>
        </div>
      </template>
    </Drawer>

    <AppConfirmModal
      v-model:visible="confirmModalVisible"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :severity="confirmModalSeverity"
      :confirm-label="confirmModalConfirmLabel"
      :loading="batchLoading"
      @confirm="confirmExecuteBatch"
    />
  </section>
</template>
