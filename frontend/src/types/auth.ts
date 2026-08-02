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

export interface AuthResponse {
  userData: string;
  aviso: boolean;
  tokenExpirationTime: number;
  data: {
    usuario: string;
    nome: string;
    nivel?: string | number;
    setor?: string;
  };
}
