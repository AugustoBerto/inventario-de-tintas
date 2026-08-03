import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import "primeicons/primeicons.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

createApp(App)
  .use(createPinia())
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: false,
      },
    },
    locale: {
      startsWith: "Começa com",
      contains: "Contém",
      notContains: "Não contém",
      endsWith: "Termina com",
      equals: "Igual",
      notEquals: "Diferente",
      noFilter: "Sem filtro",
      emptyFilterMessage: "Nenhum resultado encontrado",
      emptyMessage: "Nenhum item disponível",
      dayNames: [
        "Domingo",
        "Segunda-feira",
        "Terça-feira",
        "Quarta-feira",
        "Quinta-feira",
        "Sexta-feira",
        "Sábado",
      ],
      dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
      dayNamesMin: ["D", "S", "T", "Q", "Q", "S", "S"],
      monthNames: [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ],
      monthNamesShort: [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ],
      today: "Hoje",
      clear: "Limpar",
      dateFormat: "dd/mm/yy",
      firstDayOfWeek: 0,
    },
  })
  .use(router)
  .mount("#app");
