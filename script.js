const STORAGE_KEY = "lift-talks-dashboard";

const SUPABASE_URL = "https://attpbpqpkuwdqaxvgwnj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Tjz6uBg1ZC7JkjH_dJ1L3g_EGEpuPgZ";

const defaults = {
  titulo: "Dashboard Lift Talks",
  empresa: "Lift Contabilidade",
  dataAtualizacao: "",
  ranking: [
    { nome: "Ana Souza", apresentacoes: 8 },
    { nome: "Bruno Lima", apresentacoes: 6 },
    { nome: "Carla Mendes", apresentacoes: 5 },
    { nome: "Diego Rocha", apresentacoes: 4 },
    { nome: "Elisa Prado", apresentacoes: 3 },
    { nome: "Felipe Nunes", apresentacoes: 2 }
  ],
  proximas: [
    { data: "06/08/2026", nome: "Gabriela Alves" },
    { data: "13/08/2026", nome: "Henrique Costa" },
    { data: "20/08/2026", nome: "Isabela Torres" },
    { data: "27/08/2026", nome: "João Pedro Ramos" },
    { data: "03/09/2026", nome: "Karina Duarte" }
  ]
};

function carregarDados() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (salvo) {
      return {
        titulo: salvo.titulo ?? defaults.titulo,
        empresa: salvo.empresa ?? defaults.empresa,
        dataAtualizacao: salvo.dataAtualizacao ?? "",
        ranking: Array.isArray(salvo.ranking) ? salvo.ranking : defaults.ranking,
        proximas: Array.isArray(salvo.proximas) ? salvo.proximas : defaults.proximas
      };
    }
  } catch (e) {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(defaults));
}

const dados = carregarDados();

const headersSupabase = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

async function carregarDoServidor() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dashboard?select=data&id=eq.main`, {
      headers: headersSupabase
    });
    if (!res.ok) return null;
    const linhas = await res.json();
    return linhas.length > 0 ? linhas[0].data : null;
  } catch (e) {
    console.error("Não foi possível carregar do servidor.", e);
    return null;
  }
}

async function salvarNoServidor() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/dashboard?on_conflict=id`, {
      method: "POST",
      headers: { ...headersSupabase, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: "main", data: dados })
    });
  } catch (e) {
    console.error("Não foi possível salvar no servidor.", e);
  }
}

let timerServidor;
function salvar(imediato = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error("Não foi possível salvar no armazenamento do navegador.", e);
  }
  clearTimeout(timerServidor);
  if (imediato) {
    salvarNoServidor();
  } else {
    timerServidor = setTimeout(salvarNoServidor, 400);
  }
}

window.addEventListener("beforeunload", () => {
  if (timerServidor) {
    clearTimeout(timerServidor);
    salvarNoServidor();
  }
});

function formatarData(data) {
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function atualizarData() {
  if (!dados.dataAtualizacao) {
    dados.dataAtualizacao = formatarData(new Date());
    salvar();
  }
  document.getElementById("updateDate").textContent = dados.dataAtualizacao;
}

function renderizarCabecalho() {
  document.getElementById("title").textContent = dados.titulo;
  document.getElementById("company").textContent = dados.empresa;
  document.title = dados.titulo;
}

function renderizarRanking() {
  const tbody = document.getElementById("rankingBody");

  if (dados.ranking.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhuma apresentação realizada. Clique em "+ Adicionar".</td></tr>';
    return;
  }

  tbody.innerHTML = dados.ranking
    .map(
      (item, index) => `
        <tr data-index="${index}">
          <td class="rank-col">
            <span class="rank-top ${index < 3 ? "gold" : ""}">${index + 1}</span>
          </td>
          <td class="editable-cell" contenteditable="true" data-field="nome">${item.nome}</td>
          <td class="count-col editable-cell" contenteditable="true" data-field="apresentacoes">${item.apresentacoes}</td>
          <td class="actions-col"><button type="button" class="btn-delete" title="Excluir">×</button></td>
        </tr>`
    )
    .join("");
  vincularExclusao(tbody, dados.ranking);
}

function renderizarProximas() {
  const tbody = document.getElementById("scheduleBody");

  if (dados.proximas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Nenhuma apresentação agendada. Clique em "+ Adicionar".</td></tr>';
    return;
  }

  tbody.innerHTML = dados.proximas
    .map(
      (item, index) => `
        <tr data-index="${index}">
          <td class="date-col editable-cell" contenteditable="true" data-field="data">${item.data}</td>
          <td class="editable-cell" contenteditable="true" data-field="nome">${item.nome}</td>
          <td class="actions-col"><button type="button" class="btn-delete" title="Excluir">×</button></td>
        </tr>`
    )
    .join("");
  vincularExclusao(tbody, dados.proximas);
}

function renderizar() {
  renderizarCabecalho();
  renderizarRanking();
  renderizarProximas();
}

document.getElementById("btnAddRanking").addEventListener("click", () => {
  dados.ranking.push({ nome: "Novo Apresentador", apresentacoes: 1 });
  salvar(true);
  renderizar();
});

document.getElementById("btnAddSchedule").addEventListener("click", () => {
  dados.proximas.push({ data: "00/00/0000", nome: "Novo Apresentador" });
  salvar(true);
  renderizar();
});

function vincularExclusao(tbody, lista) {
  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const row = btn.closest("tr");
      if (!row) return;
      lista.splice(Number(row.dataset.index), 1);
      salvar(true);
      renderizar();
    });
  });
}

function sincronizarCelula(cell) {
  const row = cell.closest("tr");
  if (!row) return;

  const index = Number(row.dataset.index);
  const field = cell.dataset.field;
  const valor = cell.textContent.trim();
  const lista = cell.closest("tbody").id === "rankingBody" ? dados.ranking : dados.proximas;

  if (field === "apresentacoes") {
    const numero = parseInt(valor, 10);
    lista[index].apresentacoes = isNaN(numero) || numero < 0 ? 0 : numero;
  } else {
    lista[index][field] = valor;
  }
}

function aoEditar(bodyId, lista) {
  const body = document.getElementById(bodyId);
  body.addEventListener("blur", e => {
    const cell = e.target;
    if (!cell.hasAttribute("contenteditable")) return;
    sincronizarCelula(cell);
    salvar();
  });
  body.addEventListener("input", e => {
    const cell = e.target;
    if (!cell.hasAttribute("contenteditable")) return;
    sincronizarCelula(cell);
    salvar();
  });
}

aoEditar("rankingBody", dados.ranking);
aoEditar("scheduleBody", dados.proximas);

["title", "company"].forEach(id => {
  const el = document.getElementById(id);
  const sincronizar = () => {
    dados[id === "title" ? "titulo" : "empresa"] = el.textContent.trim();
  };
  el.addEventListener("blur", () => {
    sincronizar();
    salvar();
    renderizarCabecalho();
  });
  el.addEventListener("input", () => {
    sincronizar();
    salvar();
  });
});

document.getElementById("updateDate").addEventListener("blur", e => {
  dados.dataAtualizacao = e.target.textContent.trim();
  if (!dados.dataAtualizacao) {
    dados.dataAtualizacao = formatarData(new Date());
    atualizarData();
  }
  salvar();
});

document.getElementById("updateDate").addEventListener("input", e => {
  dados.dataAtualizacao = e.target.textContent.trim();
  salvar();
});

async function iniciar() {
  const dadosServidor = await carregarDoServidor();
  if (dadosServidor && dadosServidor.ranking) {
    dados.titulo = dadosServidor.titulo ?? dados.titulo;
    dados.empresa = dadosServidor.empresa ?? dados.empresa;
    dados.dataAtualizacao = dadosServidor.dataAtualizacao ?? dados.dataAtualizacao;
    dados.ranking = Array.isArray(dadosServidor.ranking) ? dadosServidor.ranking : dados.ranking;
    dados.proximas = Array.isArray(dadosServidor.proximas) ? dadosServidor.proximas : dados.proximas;
    salvar();
  } else {
    await salvarNoServidor();
  }
  atualizarData();
  renderizar();
}

document.addEventListener("DOMContentLoaded", iniciar);
