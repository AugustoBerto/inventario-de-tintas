<script setup lang="ts">
import { ref } from "vue";
import { AxiosError } from "axios";
import { useRoute, useRouter } from "vue-router";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { useSessionStore } from "@/stores/session";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const errorMessage = ref("");

const schema = toTypedSchema(
  z.object({
    usuario: z.string().trim().min(1, "Informe o usuário."),
    senha: z.string().min(1, "Informe a senha."),
  }),
);

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
});
const [usuario] = defineField("usuario");
const [senha] = defineField("senha");

const submit = handleSubmit(async (values) => {
  errorMessage.value = "";
  try {
    await session.login(values.usuario, values.senha);
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.push(redirect);
  } catch (error) {
    errorMessage.value =
      error instanceof Error && error.message === "INVENTORY_ACCESS_DENIED"
        ? session.accessMessage ||
          "Seu usuário corporativo não possui acesso ao inventário."
        : error instanceof AxiosError && error.response?.status === 401
          ? "Usuário ou senha incorretos."
          : "A autenticação está temporariamente indisponível. Tente novamente.";
  }
});
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <span class="eyebrow">DASS</span>
      <h1>Inventário de Amostras</h1>
      <p>Acesse com suas credenciais corporativas.</p>

      <Message v-if="errorMessage" severity="error" :closable="false">
        {{ errorMessage }}
      </Message>

      <form @submit="submit">
        <label for="usuario">Usuário</label>
        <InputText
          id="usuario"
          v-model="usuario"
          autocomplete="username"
          :invalid="Boolean(errors.usuario)"
        />
        <small class="field-error">{{ errors.usuario }}</small>

        <label for="senha">Senha</label>
        <Password
          input-id="senha"
          v-model="senha"
          autocomplete="current-password"
          :feedback="false"
          toggle-mask
          :invalid="Boolean(errors.senha)"
        />
        <small class="field-error">{{ errors.senha }}</small>

        <Button
          type="submit"
          label="Entrar"
          icon="pi pi-sign-in"
          :loading="isSubmitting"
        />
      </form>
    </section>
  </main>
</template>
