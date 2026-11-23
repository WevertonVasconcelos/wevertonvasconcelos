// Configuração do site de notas.
// Preencha com os dados do seu projeto Supabase
// (Painel do Supabase > Project Settings > API Keys / Data API).
// Essas duas chaves são públicas por natureza: a proteção dos dados
// vem das regras de segurança criadas pelo arquivo supabase/setup.sql.
window.NOTAS_CONFIG = {
  // Ex.: "https://abcdefghijkl.supabase.co"
  SUPABASE_URL: "",

  // Chave "publishable" (sb_publishable_...) ou a chave "anon" antiga.
  // NUNCA coloque aqui a chave "secret" / "service_role".
  SUPABASE_ANON_KEY: "",

  // O login é feito só com "usuário". Por trás, o Supabase precisa de um
  // e-mail, então o site transforma "weverton" em "weverton@notas.app".
  // Não é um e-mail de verdade e nada é enviado para ele.
  DOMINIO_USUARIO: "notas.app",

  // Sai sozinho depois desse tempo sem uso (exceto quando
  // "Manter conectado neste aparelho" foi marcado).
  MINUTOS_INATIVIDADE: 30,
};
