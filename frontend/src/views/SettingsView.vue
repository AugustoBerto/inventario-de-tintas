<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { AxiosError } from "axios";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import {
  createAccessUser,
  getSettings,
  listAccessUsers,
  lookupCorporateUser,
  updateAccessUser,
  updateSettings,
} from "@/services/admin";
import type { CorporateUserLookup } from "@/services/admin";
import type { InventoryAccess, InventorySettings } from "@/types/sample";

const settings = reactive<InventorySettings>({
  defaultDrawerCapacity: 100,
  capacityAlertPercent: 80,
  expirationAlertDays: 30,
});
const users = ref<InventoryAccess[]>([]);
const registrationSearch = ref("");
const message = ref("");
const errorMessage = ref("");
const saving = ref(false);
const lookingUp = ref(false);
const corporateUser = ref<CorporateUserLookup | null>(null);
const newUser = reactive({
  registration: "",
  profile: "VIEWER" as InventoryAccess["profile"],
});
const profiles = ["ADMIN", "OPERATOR", "VIEWER"];

const loadUsers = async () => {
  users.value = await listAccessUsers(registrationSearch.value);
};

const saveSettings = async () => {
  saving.value = true;
  errorMessage.value = "";
  try {
    Object.assign(settings, await updateSettings({ ...settings }));
    message.value = "Configurações atualizadas.";
  } catch {
    errorMessage.value = "Revise as configurações informadas.";
  } finally {
    saving.value = false;
  }
};

const addUser = async () => {
  errorMessage.value = "";
  try {
    await createAccessUser({ ...newUser });
    Object.assign(newUser, {
      registration: "",
      profile: "VIEWER",
    });
    corporateUser.value = null;
    await loadUsers();
    message.value = "Acesso concedido.";
  } catch {
    errorMessage.value = "Não foi possível conceder o acesso.";
  }
};

const findCorporateUser = async () => {
  corporateUser.value = null;
  errorMessage.value = "";
  if (!newUser.registration.trim()) {
    errorMessage.value = "Informe a matrícula.";
    return;
  }
  lookingUp.value = true;
  try {
    corporateUser.value = await lookupCorporateUser(
      newUser.registration.trim(),
    );
  } catch (error) {
    errorMessage.value =
      error instanceof AxiosError
        ? (error.response?.data?.message ??
          "Não foi possível consultar o Auth Service.")
        : "Não foi possível consultar o Auth Service.";
  } finally {
    lookingUp.value = false;
  }
};

const saveUser = async (user: InventoryAccess) => {
  try {
    await updateAccessUser(user.id, {
      profile: user.profile,
      active: user.active,
    });
    message.value = "Acesso atualizado.";
  } catch {
    errorMessage.value = "Não foi possível atualizar o acesso.";
  }
};

onMounted(async () => {
  try {
    Object.assign(settings, await getSettings());
    await loadUsers();
  } catch {
    errorMessage.value = "Não foi possível carregar a administração.";
  }
});
</script>

<template>
  <section class="page-section">
    <span class="eyebrow">Administração</span>
    <h1>Configurações e acessos</h1>
    <p class="subtitle">Parâmetros operacionais e permissões do inventário.</p>

    <Message v-if="message" severity="success" closable @close="message = ''">
      {{ message }}
    </Message>
    <Message
      v-if="errorMessage"
      severity="error"
      closable
      @close="errorMessage = ''"
    >
      {{ errorMessage }}
    </Message>

    <section class="content-card admin-section">
      <h2>Configurações</h2>
      <div class="settings-grid">
        <label>
          Capacidade padrão
          <InputNumber v-model="settings.defaultDrawerCapacity" :min="1" />
        </label>
        <label>
          Alerta de capacidade (%)
          <InputNumber
            v-model="settings.capacityAlertPercent"
            :min="1"
            :max="100"
          />
        </label>
        <label>
          Alerta de validade (dias)
          <InputNumber v-model="settings.expirationAlertDays" :min="0" />
        </label>
      </div>
      <Button
        label="Salvar configurações"
        :loading="saving"
        @click="saveSettings"
      />
    </section>

    <section class="content-card admin-section">
      <h2>Conceder acesso</h2>
      <div class="access-lookup">
        <label>
          Matrícula
          <span class="search-form">
            <InputText
              v-model="newUser.registration"
              @keydown.enter.prevent="findCorporateUser"
            />
            <Button
              label="Buscar"
              icon="pi pi-search"
              :loading="lookingUp"
              @click="findCorporateUser"
            />
          </span>
        </label>
      </div>
      <div v-if="corporateUser" class="corporate-user-card">
        <div>
          <span>Colaborador</span>
          <strong>{{ corporateUser.displayName }}</strong>
        </div>
        <div>
          <span>Setor</span>
          <strong>{{ corporateUser.department || "Não informado" }}</strong>
        </div>
        <div>
          <span>Função</span>
          <strong>{{ corporateUser.function || "Não informada" }}</strong>
        </div>
        <label>
          Perfil
          <Select v-model="newUser.profile" :options="profiles" />
        </label>
      </div>
      <Button
        label="Conceder acesso"
        icon="pi pi-user-plus"
        :disabled="!corporateUser"
        @click="addUser"
      />
    </section>

    <section class="content-card admin-section">
      <div class="page-heading">
        <h2>Acessos existentes</h2>
        <form class="search-form" @submit.prevent="loadUsers">
          <InputText
            v-model="registrationSearch"
            placeholder="Pesquisar matrícula"
          />
          <Button type="submit" icon="pi pi-search" aria-label="Pesquisar" />
        </form>
      </div>
      <div class="access-list">
        <article v-for="user in users" :key="user.id">
          <div>
            <strong>{{ user.displayName }}</strong>
            <span>{{ user.registration || user.corporateUserId }}</span>
          </div>
          <Select v-model="user.profile" :options="profiles" />
          <label class="active-toggle">
            <ToggleSwitch v-model="user.active" />
            Ativo
          </label>
          <Button label="Salvar" text @click="saveUser(user)" />
        </article>
      </div>
    </section>
  </section>
</template>
