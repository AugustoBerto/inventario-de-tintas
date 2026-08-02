export interface AuthUser {
  id: number | string;
  usuario: string;
  matricula?: string | number;
  nome: string;
  setor?: string;
  nivel?: string | number;
  unidade?: string;
  funcao?: string;
}
