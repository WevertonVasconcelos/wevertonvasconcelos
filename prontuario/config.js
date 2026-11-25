// Configuração do Prontuário Véras Vasconcelos.
// Preencha com os dados do projeto Supabase do PRONTUÁRIO
// (um projeto separado do site de notas; veja o LEIAME.md).
// Essas duas chaves são públicas por natureza: quem protege os dados
// é o login e as regras do arquivo supabase/setup.sql.
window.PRONTUARIO_CONFIG = {
  // Ex.: "https://abcdefghijkl.supabase.co"
  SUPABASE_URL: "https://yqvvabvdagqhlagckaad.supabase.co",

  // Chave "publishable" (sb_publishable_...) ou a chave "anon" antiga.
  // NUNCA coloque aqui a chave "secret" / "service_role".
  SUPABASE_ANON_KEY: "sb_publishable_xOtjkEb77qTBi-3BHYUslg_Nj4VE9tX",

  // O login é só com "usuário": "mariana" vira "mariana@prontuario.app".
  // Não é um e-mail de verdade e nada é enviado para ele.
  DOMINIO_USUARIO: "prontuario.app",

  // Sai sozinho depois desse tempo parado
  // (exceto quando "Manter conectado neste aparelho" foi marcado).
  MINUTOS_INATIVIDADE: 30,
};
