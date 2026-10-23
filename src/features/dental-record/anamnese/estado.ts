import type { Paciente } from '../../clinic/context/ClinicContext';
import type {
  Afericao,
  AnamneseCliFor45,
  EvolucaoLinha,
  ExameDental,
  ExameFisico,
  Identificacao,
} from './tipos';

const PREFIXO_RASCUNHO = 'unicare:anamnese-cli45:';
const VERSAO = 2;

function chaveRascunho(pacienteId: number) {
  return `${PREFIXO_RASCUNHO}${pacienteId}`;
}

export function criarAfericaoVazia(): Afericao {
  return {
    sistolica: '',
    diastolica: '',
    fc: '',
    fr: '',
    temperatura: '',
    dia: '',
  };
}

function evolucaoVazia(): EvolucaoLinha {
  return { data: '', intervencao: '', assinaturaDocente: '' };
}

function afericaoEmBranco(afericao: Afericao): boolean {
  return (
    afericao.sistolica.trim() === '' &&
    afericao.diastolica.trim() === '' &&
    afericao.fc.trim() === '' &&
    afericao.fr.trim() === '' &&
    afericao.temperatura.trim() === '' &&
    afericao.dia.trim() === ''
  );
}

function evolucaoEmBranco(linha: EvolucaoLinha): boolean {
  return (
    linha.data.trim() === '' &&
    linha.intervencao.trim() === '' &&
    linha.assinaturaDocente.trim() === ''
  );
}

function apararLinhasVazias<T>(linhas: T[], estaVazia: (linha: T) => boolean): T[] {
  const copia = [...linhas];
  while (copia.length > 1 && estaVazia(copia[copia.length - 1])) {
    copia.pop();
  }
  return copia;
}

function exameFisicoVazio(): ExameFisico {
  return {
    afericoes: [criarAfericaoVazia()],
    assimetrias: '',
    linfonodos: '',
    estomatograma: {
      regioes: [],
      alteracao: '',
      descricao: '',
    },
    periodonto: {
      cor: '',
      textura: '',
      forma: '',
      observacoes: '',
    },
  };
}

function exameDentalVazio(): ExameDental {
  return {
    exames: {
      radiografico: [],
      radiograficoOutros: '',
      hematologico: '',
      outros: '',
    },
    planejamento: [''],
    termo: {
      paciente: '',
      discente: '',
      professor: '',
    },
    evolucao: [evolucaoVazia()],
  };
}

export function calcularIdade(
  dataNascimento: string,
  referencia: Date = new Date()
): string {
  if (!dataNascimento) return '';
  const nascimento = new Date(`${dataNascimento}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return '';

  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const mes = referencia.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade >= 0 ? String(idade) : '';
}

function identificacaoVazia(paciente?: Paciente): Identificacao {
  const dataNascimento = paciente?.dataNascimento ?? '';

  return {
    nome: paciente?.nome ?? '',
    rg: '',
    dataNascimento,
    idade: calcularIdade(dataNascimento),
    etnia: '',
    genero: '',
    estadoCivil: '',
    naturalidade: '',
    endereco: '',
    cep: '',
    uf: '',
    telefone: '',
    celular: paciente?.telefone ?? '',
    trabalho: '',
  };
}

export function criarAnamneseVazia(paciente?: Paciente): AnamneseCliFor45 {
  return {
    versao: VERSAO,
    atualizadoEm: new Date().toISOString(),
    identificacao: identificacaoVazia(paciente),
    historiaMedica: {
      tratamentoAtual: '',
      tratamentoQual: '',
      medicoServico: '',
      medicoFone: '',
      medicamentos: '',
      cardiovascular: [],
      respiratorio: [],
      geniturinario: [],
      gastrintestinal: [],
      nervosoMuscular: [],
      endocrino: [],
      antecedentesFamiliais: [],
    },
    historiaOdontologica: {
      historiaDoenca: '',
      dificuldadeMastigacao: '',
      denteSensivel: '',
      gengivaSangra: '',
      dificuldadeAbrirBoca: '',
      feridasBoca: '',
      rangeDentes: '',
      estalos: '',
      ultimaVisita: '',
    },
    habitos: {
      higieneFrequencia: '',
      higieneRecursos: [],
      alimentacao: [],
      tabagismo: '',
      tabagismoFrequencia: '',
      etilismo: '',
      etilismoFrequencia: '',
      outrosHabitos: '',
    },
    declaracao: {
      nome: paciente?.nome ?? '',
      cpf: paciente?.cpf ?? '',
      rg: '',
      local: '',
      dia: '',
      mes: '',
      ano: '',
      assinaturaPaciente: '',
    },
    exameFisico: exameFisicoVazio(),
    exameDental: exameDentalVazio(),
  };
}

export function carregarRascunho(pacienteId: number): AnamneseCliFor45 | null {
  try {
    const bruto = window.sessionStorage.getItem(chaveRascunho(pacienteId));
    if (!bruto) return null;

    const dados = JSON.parse(bruto) as AnamneseCliFor45;
    if (!dados || dados.versao !== VERSAO || !dados.identificacao) {
      return null;
    }

    return {
      ...dados,
      exameFisico: {
        ...dados.exameFisico,
        afericoes: apararLinhasVazias(
          dados.exameFisico?.afericoes ?? [],
          afericaoEmBranco
        ),
      },
      exameDental: {
        ...dados.exameDental,
        planejamento: apararLinhasVazias(
          dados.exameDental?.planejamento ?? [],
          (texto) => texto.trim() === ''
        ),
        evolucao: apararLinhasVazias(
          dados.exameDental?.evolucao ?? [],
          evolucaoEmBranco
        ),
      },
    };
  } catch {
    return null;
  }
}

export function salvarRascunho(pacienteId: number, dados: AnamneseCliFor45): boolean {
  try {
    window.sessionStorage.setItem(
      chaveRascunho(pacienteId),
      JSON.stringify({ ...dados, atualizadoEm: new Date().toISOString() })
    );
    return true;
  } catch {
    // Sem espaço ou com sessionStorage bloqueado, o rascunho não é gravado.
    // A tela continua utilizável; o usuário ainda pode exportar o JSON.
    return false;
  }
}

export function listarEvolucoesRascunho(pacienteId: number): EvolucaoLinha[] {
  const rascunho = carregarRascunho(pacienteId);
  if (!rascunho) return [];

  return [...rascunho.exameDental.evolucao]
    .filter((linha) => linha.intervencao.trim() !== '')
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function listarAfericoesRascunho(pacienteId: number): Afericao[] {
  const rascunho = carregarRascunho(pacienteId);
  if (!rascunho) return [];

  return rascunho.exameFisico.afericoes.filter(
    (afericao) => !afericaoEmBranco(afericao)
  );
}

export function adicionarAfericaoRascunho(
  paciente: Paciente,
  afericao: Afericao
): { ok: boolean; afericoes: Afericao[] } {
  const base = carregarRascunho(paciente.id) ?? criarAnamneseVazia(paciente);

  // A linha em branco é só espaço de edição da Página 2; o registro novo entra
  // no fim sem deixar uma linha vazia sobrando acima dele.
  const afericoes = [
    ...base.exameFisico.afericoes.filter((item) => !afericaoEmBranco(item)),
    afericao,
  ];

  const atualizado: AnamneseCliFor45 = {
    ...base,
    exameFisico: { ...base.exameFisico, afericoes },
  };
  const ok = salvarRascunho(paciente.id, atualizado);
  return { ok, afericoes };
}

export function adicionarEvolucaoRascunho(
  paciente: Paciente,
  linha: EvolucaoLinha
): { ok: boolean; linhas: EvolucaoLinha[] } {
  const base = carregarRascunho(paciente.id) ?? criarAnamneseVazia(paciente);

  // Linhas em branco são só espaços de edição da Folha; o registro novo entra
  // no fim do histórico sem deixar uma linha vazia sobrando acima dele.
  const evolucao = [
    ...base.exameDental.evolucao.filter((item) => !evolucaoEmBranco(item)),
    linha,
  ];

  const atualizado: AnamneseCliFor45 = {
    ...base,
    exameDental: { ...base.exameDental, evolucao },
  };
  const ok = salvarRascunho(paciente.id, atualizado);
  return { ok, linhas: atualizado.exameDental.evolucao };
}

export function removerRascunho(pacienteId: number): void {
  try {
    window.sessionStorage.removeItem(chaveRascunho(pacienteId));
  } catch {
    // Nada a fazer: não havia rascunho gravado.
  }
}

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportarJson(paciente: Paciente | undefined, dados: AnamneseCliFor45): void {
  const conteudo = {
    documento: 'CLI-FOR-45 — Anamnese e Exame Físico (Adulto e Idoso)',
    versao: VERSAO,
    exportadoEm: new Date().toISOString(),
    paciente: paciente
      ? {
          nome: paciente.nome,
          cpf: paciente.cpf,
          dataNascimento: paciente.dataNascimento,
          telefone: paciente.telefone,
        }
      : null,
    anamnese: { ...dados, atualizadoEm: new Date().toISOString() },
  };

  const blob = new Blob([JSON.stringify(conteudo, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nome = slug(paciente?.nome ?? 'paciente') || 'paciente';
  const data = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `anamnese-cli-for-45-${nome}-${data}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function alternarValor<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((item) => item !== valor)
    : [...lista, valor];
}

export function formatarDataHora(iso: string): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR');
}
