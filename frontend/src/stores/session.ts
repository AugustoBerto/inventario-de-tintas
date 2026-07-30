import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { http } from "@/services/http";
import type { AuthResponse, AuthUser } from "@/types/auth";

const decodeUser = (encoded: string): AuthUser => {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as AuthUser;
};

export const useSessionStore = defineStore("session", () => {
  const user = ref<AuthUser | null>(null);
  const initialized = ref(false);
  const authenticated = computed(() => user.value !== null);

  const applyResponse = (response: AuthResponse) => {
    user.value = decodeUser(response.userData);
  };

  const restore = async () => {
    try {
      const { data } = await http.post<AuthResponse>("/auth/me");
      applyResponse(data);
    } catch {
      user.value = null;
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
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } finally {
      user.value = null;
    }
  };

  return { user, initialized, authenticated, restore, login, logout };
});

