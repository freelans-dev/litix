/**
 * Builds public consultation URL for a given tribunal and CNJ.
 * Returns empty string if the tribunal is not mapped.
 */

const TRIBUNAL_URL_BUILDERS: Record<string, (cnj: string) => string> = {
  // Estaduais - PJe
  TJAC: (cnj) => `https://esaj.tjac.jus.br/cpopg/open.do?cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsultaNuUnificado=${cnj}`,
  TJAL: (cnj) => `https://pje.tjal.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJAM: (cnj) => `https://consultasaj.tjam.jus.br/cpopg/open.do?cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsultaNuUnificado=${cnj}`,
  TJBA: (cnj) => `https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJCE: (cnj) => `https://pje.tjce.jus.br/pje1grau/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJDF: (cnj) => `https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJES: (cnj) => `https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJGO: (cnj) => `https://pje.tjgo.jus.br/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJMA: (cnj) => `https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJMT: (cnj) => `https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJMS: (cnj) => `https://esaj.tjms.jus.br/cpopg5/open.do?cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsultaNuUnificado=${cnj}`,
  TJMG: (cnj) => `https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJPA: (cnj) => `https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJPB: (cnj) => `https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJPR: (cnj) => `https://projudi.tjpr.jus.br/projudi/processo/buscaProcesso.do?actionType=pesquisar&numero_processo=${cnj}`,
  TJPE: (cnj) => `https://pje.tjpe.jus.br/1g/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJPI: (cnj) => `https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJRJ: (cnj) => `https://www3.tjrj.jus.br/ejud/ConsultaProcesso.aspx?N=${cnj.replace(/\D/g, '')}`,
  TJRN: (cnj) => `https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJRS: (cnj) => `https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index&proxystylesheet=wp_index&q=${cnj}`,
  TJRO: (cnj) => `https://pje.tjro.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJSC: (cnj) => `https://esaj.tjsc.jus.br/cpopg/open.do?cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsultaNuUnificado=${cnj}`,
  TJSP: (cnj) => `https://esaj.tjsp.jus.br/cpopg/open.do?cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&dadosConsulta.valorConsultaNuUnificado=${cnj}`,
  TJSE: (cnj) => `https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TJTO: (cnj) => `https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,

  // Federais
  TRF1: (cnj) => `https://pje1g.trf1.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TRF2: (cnj) => `https://pje.trf2.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TRF3: (cnj) => `https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TRF4: (cnj) => `https://pje.trf4.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,
  TRF5: (cnj) => `https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam?numero=${cnj}`,

  // Superiores
  STF: (cnj) => `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${cnj.replace(/\D/g, '')}`,
  STJ: (cnj) => `https://processo.stj.jus.br/processo/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNumeroUnico&termo=${cnj}`,
  TST: (cnj) => `https://pje.tst.jus.br/consultaprocessual/pages/consultas/ConsultaProcessual.seam?numero=${cnj}`,
};

export function getTribunalLink(sigla: string, cnj: string): string {
  const builder = TRIBUNAL_URL_BUILDERS[sigla];
  return builder ? builder(cnj) : '';
}
