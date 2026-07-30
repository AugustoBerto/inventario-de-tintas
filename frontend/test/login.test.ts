import Aura from "@primeuix/themes/aura";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import LoginView from "@/views/LoginView.vue";

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginView", () => {
  it("apresenta os campos corporativos", () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [
          [PrimeVue, { theme: { preset: Aura } }],
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
      },
    });

    expect(wrapper.get('label[for="usuario"]').text()).toBe("Usuário");
    expect(wrapper.get('label[for="senha"]').text()).toBe("Senha");
    expect(wrapper.get('button[type="submit"]').text()).toContain("Entrar");
  });
});
