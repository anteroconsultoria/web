/**
 * ANTERO® CONSULTORIA — INTEGRAÇÃO FORMULÁRIO DO SITE -> GOOGLE SHEETS
 *
 * Como ativar:
 * 1. Abra a planilha "Agendamentos - Antero Consultoria" no Google Sheets.
 * 2. Vá em Extensões > Apps Script.
 * 3. Apague o conteúdo padrão e cole este código completo.
 * 4. Clique em Salvar (ícone de disquete).
 * 5. Clique em Implantar > Nova implantação > Tipo: App da Web.
 *    - Executar como: Eu (seu e-mail)
 *    - Quem pode acessar: Qualquer pessoa
 * 6. Copie a URL gerada e cole na constante `webhookUrl` dentro do arquivo `script.js`.
 */

const SHEET_NAME = 'Agendamentos';
const CONSULTANT_EMAIL = Session.getActiveUser().getEmail(); // Recebe alertas de novos agendamentos

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    const nowFormatted = Utilities.formatDate(
      new Date(),
      'America/Fortaleza',
      'dd/MM/yyyy HH:mm'
    );

    const formattedDate = formatIsoDateToBR(data.date);

    // Ordem exata das 13 colunas da aba "Agendamentos"
    sheet.appendRow([
      nowFormatted,                             // A: Data do Registro
      data.id || ('lead-' + Date.now()),        // B: ID
      data.name || '',                          // C: Nome Completo
      data.company || '',                       // D: Empresa / Marca
      data.whatsapp || '',                      // E: WhatsApp
      data.email || '',                         // F: E-mail
      data.service || '',                       // G: Objetivo Principal
      formattedDate,                            // H: Data Desejada
      data.time || '',                          // I: Horário
      data.notes || '',                         // J: Observações
      data.notifyWhatsapp ? 'Sim' : 'Não',      // K: Lembrete WhatsApp
      data.notifyEmail ? 'Sim' : 'Não',         // L: Lembrete E-mail
      data.status || 'Agendado'                 // M: Status
    ]);

    // 1. Alerta automático por e-mail para a Antero Consultoria
    if (CONSULTANT_EMAIL) {
      MailApp.sendEmail({
        to: CONSULTANT_EMAIL,
        subject: `[Novo Agendamento] ${data.name} — ${data.company}`,
        body:
          `Novo pedido de 1ª Consultoria Grátis recebido pelo site!\n\n` +
          `Nome: ${data.name}\n` +
          `Empresa / Marca: ${data.company}\n` +
          `WhatsApp: ${data.whatsapp}\n` +
          `E-mail: ${data.email}\n` +
          `Objetivo: ${data.service}\n` +
          `Data desejada: ${formattedDate} às ${data.time}\n` +
          `Observações: ${data.notes || 'Nenhuma'}\n\n` +
          `Acesse a planilha para atualizar o status e enviar a confirmação.`
      });
    }

    // 2. E-mail automático de confirmação para o cliente (se marcado no formulário)
    if (data.notifyEmail && data.email) {
      MailApp.sendEmail({
        to: data.email,
        subject: 'Recebemos seu agendamento — Antero® Consultoria',
        body:
          `Olá, ${data.name}!\n\n` +
          `Recebemos sua solicitação de 1ª Consultoria Gratuita para a marca "${data.company}".\n\n` +
          `Resumo do agendamento:\n` +
          `- Assunto: ${data.service}\n` +
          `- Data: ${formattedDate}\n` +
          `- Horário: ${data.time}\n\n` +
          `Nossa equipe entrará em contato em breve pelo WhatsApp (85) 9255-0496 para confirmar os detalhes.\n\n` +
          `Atenciosamente,\n` +
          `Equipe Antero® Consultoria de Aceleração e Internacionalização de Marcas`
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatIsoDateToBR(isoDate) {
  if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) {
    return isoDate || '';
  }
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
