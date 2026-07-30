import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { AxiosError } from "axios";
import { http } from "@/services/http";
import type { AuthResponse, AuthUser } from "@/types/auth";
import type { InventoryAccess } from "@/types/sample";

const decodeUser = (encoded: string): AuthUser => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as AuthUser;
};

export const useSessionStore = defineStore("session", () => {
  const user = ref<AuthUser | null>(null);
  const initialized = ref(false);
  const access = ref<InventoryAccess | null>(null);
  const accessDenied = ref(false);
  const authenticated = computed(() => user.value !== null);
  const canWrite = computed(
    () => access.value?.profile === "ADMIN" || access.value?.profile === "OPERATOR",
  );
  const isAdmin = computed(() => access.value?.profile === "ADMIN");

  const loadInventoryAccess = async () => {
    try {
      const { data } = await http.get<{ access: InventoryAccess }>("/inventory/session");
      access.value = data.access;
      accessDenied.value = false;
    } catch (error) {
      access.value = null;
      if (error instanceof AxiosError && error.response?.status === 403) {
        accessDenied.value = true;
        return;
      }
      accessDenied.value = false;
      throw error;
    }
  };

  const applyResponse = (response: AuthResponse) => {
    user.value = decodeUser(response.userData);
  };

  const restore = async () => {
    try {
      const { data } = await http.post<AuthResponse>("/auth/me");
      applyResponse(data);
      await loadInventoryAccess();
    } catch {
      user.value = null;
      access.value = null;
    } finally {
      initialized.value = true;
    }
  };

  const login = async (usuario: string, senha: string) => {
    const { data } = await http.post<AuthResponse>("/auth/login", {
      usuario,
      senha,
    });
    applyResponse(data);
    await loadInventoryAccess();
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } finally {
      user.value = null;
      access.value = null;
      accessDenied.value = false;
    }
  };

  return {
    user,
    access,
    accessDenied,
    initialized,
    authenticated,
    canWrite,
    isAdmin,
    restore,
    login,
    logout,
  };
});
