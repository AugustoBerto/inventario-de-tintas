<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { AxiosError } from "axios";
import { toTypedSchema } from "@vee-validate/zod";
import { useForm } from "vee-validate";
import { z } from "zod";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import Textarea from "primevue/textarea";
import { createSample, listDrawers, updateSample } from "@/services/samples";
import {
  formatDrawerLabel,
  type DrawerSummary,
  type Sample,
  type SampleInput,
} from "@/types/sample";

const props = defineProps<{ sample?: Sample | null }>();
const emit = defineEmits<{ saved: [sample: Sample] }>();

const optionalText = (max: number) => z.string().trim().max(max).optional();
const schema = toTypedSchema(
  z.object({
    reference: z.string().trim().min(1, "Informe a referência.").max(80),
    expiresAt: z.string().optional(),
    productBase: optionalText(120),
    supplier: optionalText(120),
    color: optionalText(120),
    substrate: optionalText(120),
    voc: z.enum(["SOLVENTE", "BASE_AGUA"]).nullable().optional(),
    paintApplication: optionalText(120),
    brand: optionalText(120),
    coat: optionalText(40),
    notes: optionalText(4000),
  }),
);

const initialValues = (sample?: Sample | null) => ({
  reference: sample?.reference ?? "",
  expiresAt: sample?.expiresAt ?? "",
  productBase: sample?.productBase ?? "",
  supplier: sample?.supplier ?? "",
  color: sample?.color ?? "",
  substrate: sample?.substrate ?? "",
  voc: sample?.voc ?? null,
  paintApplication: sample?.paintApplication ?? "",
  brand: sample?.brand ?? "",
  coat: sample?.coat ?? "",
  notes: sample?.notes ?? "",
});

const {
  defineField,
  errors,
  handleSubmit,
  isSubmitting,
  resetForm,
  setFieldError,
  setErrors,
} = useForm({
  validationSchema: schema,
  initialValues: initialValues(props.sample),
});

const [reference] = defineField("reference");
/* DESABILITADO: Data da amostra / Fabricação
const [sampleDate] = defineField("sampleDate");
const [manufacturedAt] = defineField("manufacturedAt");
*/
const [expiresAt] = defineField("expiresAt");
const [productBase] = defineField("productBase");
const [supplier] = defineField("supplier");
const [color] = defineField("color");
const [substrate] = defineField("substrate");
const [voc] = defineField("voc");
const [paintApplication] = defineField("paintApplication");
const [brand] = defineField("brand");
const [coat] = defineField("coat");
const [notes] = defineField("notes");

const expiresAtDate = computed<Date | null>({
  get() {
    if (!expiresAt.value) return null;
    const [year, month, day] = expiresAt.value.split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
  },
  set(val: Date | null) {
    if (!val || isNaN(val.getTime())) {
      expiresAt.value = "";
      return;
    }
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const day = String(val.getDate()).padStart(2, "0");
    expiresAt.value = `${year}-${month}-${day}`;
  },
});

const editing = computed(() => Boolean(props.sample));
const keepValues = ref(false);
const drawers = ref<DrawerSummary[]>([]);
const drawerId = ref<string>("");

const vocOptions = [
  { label: "Solvente", value: "SOLVENTE" },
  { label: "Base água", value: "BASE_AGUA" },
];

const drawerOptions = computed(() => [
  { label: "Endereçamento automático (Gaveta recomendada)", value: "" },
  ...drawers.value.map((drawer) => ({
    label: `${formatDrawerLabel(drawer)} (${drawer.occupied}/${drawer.capacity})`,
    value: drawer.id,
    disabled: drawer.available === 0,
  })),
]);

onMounted(async () => {
  try {
    drawers.value = await listDrawers();
  } catch {
    // A lista de gavetas é opcional no formulário
  }
});

watch(
  () => props.sample,
  (sample) => resetForm({ values: initialValues(sample) }),
);

const globalError = ref("");

const submit = handleSubmit(async (values) => {
  setErrors({});
  globalError.value = "";
  try {
    const payload: SampleInput = {
      ...values,
      reference: editing.value ? undefined : values.reference,
      voc: values.voc ?? undefined,
      drawerId: drawerId.value || undefined,
    };
    const saved =
      editing.value && props.sample
        ? await updateSample(props.sample.id, payload)
        : await createSample(payload);
    emit("saved", saved);
    if (!editing.value) {
      drawerId.value = "";
      resetForm({
        values: keepValues.value
          ? { ...values, reference: "" }
          : initialValues(),
      });
    }
  } catch (error) {
    const response = (
      error as AxiosError<{ message?: string; fields?: Record<string, string> }>
    ).response?.data;
    let hasFieldErrors = false;
    for (const [field, message] of Object.entries(response?.fields ?? {})) {
      setFieldError(field as keyof typeof values, message);
      hasFieldErrors = true;
    }
    if (!hasFieldErrors) {
      globalError.value =
        response?.message ?? "Não foi possível salvar a amostra.";
    }
  }
});
</script>

<template>
  <form class="sample-form" @submit="submit">
    <Message v-if="globalError" severity="error" :closable="true" @close="globalError = ''">
      {{ globalError }}
    </Message>

    <Message v-if="editing" severity="info" :closable="false">
      A referência é imutável após o cadastro.
    </Message>

    <div class="form-field form-field-wide">
      <label for="reference">Referência *</label>
      <InputText
        id="reference"
        v-model="reference"
        :disabled="editing"
        :invalid="Boolean(errors.reference)"
        autocomplete="off"
      />
      <small class="field-error">{{ errors.reference }}</small>
    </div>

    <div class="form-field">
      <label for="expires-at">Validade</label>
      <DatePicker
        id="expires-at"
        v-model="expiresAtDate"
        dateFormat="dd/mm/yy"
        showIcon
        showButtonBar
        placeholder="dd/mm/aaaa"
        :invalid="Boolean(errors.expiresAt)"
      />
      <small class="field-error">{{ errors.expiresAt }}</small>
    </div>
    <div class="form-field">
      <label for="product-base">Base Produto</label>
      <InputText id="product-base" v-model="productBase" />
    </div>
    <div class="form-field">
      <label for="supplier">Fornecedor</label>
      <InputText id="supplier" v-model="supplier" />
    </div>
    <div class="form-field">
      <label for="color">Cor</label>
      <InputText id="color" v-model="color" />
    </div>
    <div class="form-field">
      <label for="substrate">Substrato</label>
      <InputText id="substrate" v-model="substrate" />
    </div>
    <div class="form-field">
      <label for="voc">VOC</label>
      <Select
        id="voc"
        v-model="voc"
        :options="vocOptions"
        option-label="label"
        option-value="value"
        placeholder="Selecione"
        show-clear
      />
      <small class="field-error">{{ errors.voc }}</small>
    </div>
    <div class="form-field">
      <label for="paint-application">Aplicação da tinta</label>
      <InputText id="paint-application" v-model="paintApplication" />
    </div>
    <div class="form-field">
      <label for="brand">Marca</label>
      <InputText id="brand" v-model="brand" />
    </div>
    <div class="form-field">
      <label for="coat">Demão</label>
      <InputText id="coat" v-model="coat" />
    </div>
    <div class="form-field form-field-wide">
      <label for="notes">Observações</label>
      <Textarea id="notes" v-model="notes" rows="4" />
    </div>

    <div v-if="!editing" class="form-field form-field-wide">
      <label for="drawer-id">Gaveta de destino</label>
      <Select
        id="drawer-id"
        v-model="drawerId"
        :options="drawerOptions"
        option-label="label"
        option-value="value"
        option-disabled="disabled"
        placeholder="Endereçamento automático (Recomendado)"
      />
    </div>

    <div v-if="!editing" class="keep-values form-field-wide">
      <ToggleSwitch v-model="keepValues" input-id="keep-values" />
      <label for="keep-values">
        Manter os dados após cadastrar e limpar somente a referência
      </label>
    </div>

    <div class="form-actions form-field-wide">
      <Button
        type="submit"
        :label="editing ? 'Salvar alterações' : 'Cadastrar amostra'"
        icon="pi pi-check"
        :loading="isSubmitting"
      />
    </div>
  </form>
</template>
