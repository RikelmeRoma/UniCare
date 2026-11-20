# -*- coding: utf-8 -*-
"""Gera o deck de apresentacao do MVP UniCare (UNINASSAU Aracaju).

Uso:
    backend\\.venv\\Scripts\\python.exe apresentacao\\gerar_slides.py
"""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.util import Inches, Pt

RAIZ = Path(__file__).resolve().parent.parent
CREST = RAIZ / "public" / "uninassau-crest.png"
SAIDA = Path(__file__).resolve().parent / "UniCare_MVP.pptx"

# ---------------------------------------------------------------- paleta
NAVY = RGBColor(0x00, 0x2B, 0x49)
BG = RGBColor(0x07, 0x14, 0x26)
CARD = RGBColor(0x0C, 0x20, 0x38)
CARD_ALT = RGBColor(0x0A, 0x1B, 0x30)
BORDA = RGBColor(0x1B, 0x3A, 0x5B)
AMARELO = RGBColor(0xFF, 0xD1, 0x00)
BRANCO = RGBColor(0xFF, 0xFF, 0xFF)
TEXTO = RGBColor(0xE8, 0xEF, 0xF7)
MUTED = RGBColor(0xA9, 0xBC, 0xD0)
VERDE = RGBColor(0x2B, 0xD4, 0xA8)

LARG = 13.333
ALT = 7.5
MARGEM = 0.75
CONTEUDO = LARG - 2 * MARGEM


# ---------------------------------------------------------------- helpers
def fundo(slide):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG


def caixa(slide, x, y, w, h, cor=CARD, borda=BORDA, raio=0.06):
    forma = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h)
    )
    try:
        forma.adjustments[0] = raio
    except (IndexError, ValueError):
        pass
    forma.fill.solid()
    forma.fill.fore_color.rgb = cor
    if borda is None:
        forma.line.fill.background()
    else:
        forma.line.color.rgb = borda
        forma.line.width = Pt(0.75)
    forma.shadow.inherit = False
    return forma


def retangulo(slide, x, y, w, h, cor, linha=None, raio=None):
    forma = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if raio is not None else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h),
    )
    if raio is not None:
        try:
            forma.adjustments[0] = raio
        except (IndexError, ValueError):
            pass
    forma.fill.solid()
    forma.fill.fore_color.rgb = cor
    if linha is None:
        forma.line.fill.background()
    else:
        forma.line.color.rgb = linha
        forma.line.width = Pt(0.75)
    forma.shadow.inherit = False
    return forma


def texto(slide, x, y, w, h, conteudo, size=14, bold=False, cor=BRANCO,
          align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, fonte="Segoe UI",
          line=1.0, italic=False):
    caixa_txt = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = caixa_txt.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line
    run = p.add_run()
    run.text = conteudo
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = fonte
    run.font.color.rgb = cor
    return caixa_txt


def paragrafos(slide, x, y, w, h, itens, size=14, cor=TEXTO, gap=8,
               line=1.08, marcador="•", marcador_cor=AMARELO,
               anchor=MSO_ANCHOR.TOP):
    caixa_txt = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = caixa_txt.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, item in enumerate(itens):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = line
        p.space_after = Pt(gap)
        if marcador:
            r = p.add_run()
            r.text = marcador + "  "
            r.font.size = Pt(size)
            r.font.bold = True
            r.font.name = "Segoe UI"
            r.font.color.rgb = marcador_cor
        r = p.add_run()
        r.text = item
        r.font.size = Pt(size)
        r.font.name = "Segoe UI"
        r.font.color.rgb = cor
    return caixa_txt


def cabecalho(slide, kicker, titulo, subtitulo=None):
    retangulo(slide, MARGEM, 0.42, 0.09, 0.09, AMARELO)
    texto(slide, MARGEM + 0.2, 0.34, CONTEUDO - 0.2, 0.3, kicker.upper(),
          size=10.5, bold=True, cor=AMARELO)
    texto(slide, MARGEM, 0.66, CONTEUDO, 0.9, titulo, size=30, bold=True, cor=BRANCO)
    if subtitulo:
        texto(slide, MARGEM, 1.38, CONTEUDO, 0.35, subtitulo, size=12.5, cor=MUTED)


def rodape(slide, numero):
    retangulo(slide, MARGEM, 7.03, CONTEUDO, 0.012, BORDA)
    texto(slide, MARGEM, 7.1, 6.0, 0.25, "UniCare  ·  UNINASSAU Aracaju",
          size=9, cor=MUTED)
    texto(slide, LARG - MARGEM - 1.2, 7.1, 1.2, 0.25, f"{numero:02d} / 10",
          size=9, cor=MUTED, align=PP_ALIGN.RIGHT)


def notas(slide, texto_nota):
    slide.notes_slide.notes_text_frame.text = texto_nota


def novo_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    fundo(slide)
    return slide


# ---------------------------------------------------------------- slides
def slide_capa(prs):
    s = novo_slide(prs)

    # aneis decorativos atras do escudo
    for diam, cor in ((5.6, RGBColor(0x10, 0x30, 0x50)), (4.4, BORDA),
                      (3.4, RGBColor(0x24, 0x4A, 0x6E))):
        anel = s.shapes.add_shape(
            MSO_SHAPE.OVAL,
            Inches(10.15 - diam / 2), Inches(3.55 - diam / 2),
            Inches(diam), Inches(diam),
        )
        anel.fill.background()
        anel.line.color.rgb = cor
        anel.line.width = Pt(1.25)
        anel.shadow.inherit = False

    s.shapes.add_picture(str(CREST), Inches(8.55), Inches(1.95), height=Inches(3.2))

    s.shapes.add_picture(str(CREST), Inches(MARGEM), Inches(0.55), height=Inches(0.95))
    texto(s, 1.95, 0.62, 3.0, 0.3, "UNINASSAU  ·  ARACAJU",
          size=11, bold=True, cor=AMARELO)

    texto(s, MARGEM - 0.03, 1.75, 7.2, 1.2, "UniCare", size=66, bold=True, cor=BRANCO)
    retangulo(s, MARGEM, 2.95, 1.25, 0.06, AMARELO)
    texto(s, MARGEM, 3.2, 6.4, 0.9,
          "Sistema Integrado de Saúde e Clínicas-Escola",
          size=21, cor=TEXTO, line=1.15)

    selo = caixa(s, MARGEM, 4.35, 3.55, 0.48, cor=RGBColor(0x10, 0x2B, 0x46), raio=0.5)
    selo.line.color.rgb = AMARELO
    texto(s, MARGEM, 4.44, 3.55, 0.3, "MVP  ·  NOVEMBRO DE 2026",
          size=10.5, bold=True, cor=AMARELO, align=PP_ALIGN.CENTER)

    texto(s, MARGEM, 5.2, 6.0, 0.35, "Apresentação do Produto Mínimo Viável",
          size=13, cor=MUTED)
    texto(s, MARGEM, 5.62, 6.0, 0.35, "Equipe UniCare  ·  UNINASSAU Aracaju",
          size=13, bold=True, cor=BRANCO)

    for i, (rotulo, cor) in enumerate((("PSICOLOGIA", AMARELO),
                                       ("ODONTOLOGIA", TEXTO),
                                       ("GOVERNANÇA", TEXTO))):
        x = MARGEM + i * 2.05
        pilula = caixa(s, x, 6.28, 1.9, 0.36, cor=CARD, raio=0.5)
        pilula.line.color.rgb = BORDA
        texto(s, x, 6.36, 1.9, 0.25, rotulo, size=8.5, bold=True, cor=cor,
              align=PP_ALIGN.CENTER)

    rodape(s, 1)
    notas(s, "0:00-0:20 | Abertura. 'Bom dia. Este e o UniCare, o MVP que integra a "
             "recepcao, o atendimento e a supervisao das clinicas-escola de "
             "psicologia e odontologia da UNINASSAU Aracaju. Em oito minutos eu "
             "mostro o problema, a solucao e o sistema funcionando.'")


def slide_problema(prs):
    s = novo_slide(prs)
    cabecalho(s, "O contexto", "Clínica-escola sem sistema é retrabalho em três frentes")

    cards = [
        ("01", "Agenda fragmentada",
         "Duplas, consultórios e faltas controlados fora do prontuário. O motivo "
         "da ausência se perde e a recepção vira planilha paralela."),
        ("02", "Prontuário em papel",
         "Anamnese, evolução e assinatura dispersas em fichas físicas. "
         "Homologar e auditar dependem de memória e de pasta de arquivo."),
        ("03", "Governança frágil",
         "Perfis sem escopo por clínica e nenhuma trilha imutável de quem fez "
         "o quê. O risco deixa de ser operacional e passa a ser jurídico."),
    ]
    larg_card = 3.72
    for i, (num, titulo, corpo) in enumerate(cards):
        x = MARGEM + i * (larg_card + 0.34)
        caixa(s, x, 1.85, larg_card, 3.55)
        texto(s, x + 0.32, 2.08, 1.2, 0.5, num, size=26, bold=True, cor=AMARELO)
        retangulo(s, x + 0.34, 2.62, 0.55, 0.04, AMARELO)
        texto(s, x + 0.32, 2.85, larg_card - 0.64, 0.5, titulo,
              size=18, bold=True, cor=BRANCO)
        texto(s, x + 0.32, 3.45, larg_card - 0.64, 1.7, corpo,
              size=12.5, cor=MUTED, line=1.25)

    faixa = caixa(s, MARGEM, 5.75, CONTEUDO, 0.85, cor=CARD_ALT)
    retangulo(s, MARGEM, 5.75, 0.09, 0.85, AMARELO)
    texto(s, MARGEM + 0.35, 5.93, CONTEUDO - 0.6, 0.5,
          "O custo não é só operacional: é pedagógico e jurídico.",
          size=16, bold=True, cor=BRANCO, anchor=MSO_ANCHOR.MIDDLE)

    rodape(s, 2)
    notas(s, "0:20-1:10 | O problema. Use as tres frentes: agenda, prontuario e "
             "governanca. Frase de efeito: 'sem trilha, a clinica-escola nao "
             "consegue provar o que ensinou nem o que atendeu'.")


def slide_solucao(prs):
    s = novo_slide(prs)
    cabecalho(s, "A solução", "Uma plataforma, duas clínicas, cinco perfis")

    pilares = [
        ("Recepção e triagem", "Agenda por dupla, cadastro e faltas com motivo."),
        ("Prontuário eletrônico", "Psicologia e odontologia no mesmo sistema."),
        ("Homologação docente", "Fila com parecer e devolução versionada."),
        ("Governança e auditoria", "Painel da RT, dossiê e trilha imutável."),
    ]
    for i, (titulo, desc) in enumerate(pilares):
        y = 1.82 + i * 0.98
        caixa(s, MARGEM, y, 4.75, 0.84)
        retangulo(s, MARGEM, y + 0.12, 0.06, 0.6, AMARELO)
        texto(s, MARGEM + 0.25, y + 0.1, 4.2, 0.28, titulo, size=14, bold=True, cor=BRANCO)
        texto(s, MARGEM + 0.25, y + 0.44, 4.25, 0.3, desc, size=10.5, cor=MUTED)

    requisitos = [
        ("RF-001", "Recepção e triagem"),
        ("RF-002", "Prontuário psicológico"),
        ("RF-003", "Odontograma e periograma"),
        ("RF-004", "Homologação docente"),
        ("RF-005", "Duplas clínicas"),
        ("RF-006", "Painel da RT e custódia"),
        ("RF-007", "Auditoria imutável"),
        ("RF-008", "Troca de perfil com senha"),
        ("RF-009", "RBAC e ciclo de vida"),
    ]
    base_x, base_y = 5.75, 1.82
    cw, ch = 2.22, 1.14
    for i, (rf, nome) in enumerate(requisitos):
        col, lin = i % 3, i // 3
        x = base_x + col * (cw + 0.14)
        y = base_y + lin * (ch + 0.14)
        caixa(s, x, y, cw, ch, cor=CARD_ALT)
        texto(s, x + 0.18, y + 0.14, cw - 0.36, 0.25, rf, size=10, bold=True, cor=AMARELO)
        texto(s, x + 0.18, y + 0.44, cw - 0.3, 0.6, nome, size=11.5, cor=TEXTO, line=1.05)

    faixa = caixa(s, MARGEM, 5.9, CONTEUDO, 0.72, cor=CARD)
    texto(s, MARGEM + 0.32, 6.08, CONTEUDO - 0.6, 0.4,
          "Mesmo sistema, escopo por curso: psicologia e odontologia não se misturam.",
          size=14, bold=True, cor=BRANCO, anchor=MSO_ANCHOR.MIDDLE)

    rodape(s, 3)
    notas(s, "1:10-2:00 | A solucao. Nao leia os nove RFs: mostre os quatro "
             "pilares e diga que os requisitos estao cobertos. Destaque o escopo "
             "por curso, que e o diferencial de governanca.")


def slide_jornada(prs):
    s = novo_slide(prs)
    cabecalho(s, "Como funciona", "A jornada acontece em quatro papéis")

    etapas = [
        ("1", "Recepção", "REC-002 / REC-001",
         ["Agenda por dupla e consultório", "Cadastro do paciente", "Falta com motivo e ocorrências"]),
        ("2", "Estagiário", "16032935 / 16024402",
         ["Atende a sessão ou a cadeira", "Preenche prontuário e ficha", "Exporta PDF com assinatura"]),
        ("3", "Supervisor", "DOC-8821 / DOC-9122",
         ["Vincula alunos e monta duplas", "Homologa ou devolve", "Acompanha ocorrências"]),
        ("4", "RT e coordenação", "RT-002 / RT-001 / COORD-001",
         ["Painel e indicadores", "Dossiê de custódia", "Equipe, auditoria e escopo"]),
    ]
    cw = 2.75
    gap = 0.28
    for i, (num, papel, conta, itens) in enumerate(etapas):
        x = MARGEM + i * (cw + gap)
        caixa(s, x, 1.82, cw, 3.6)
        circulo = s.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(x + 0.22), Inches(2.02), Inches(0.5), Inches(0.5)
        )
        circulo.fill.solid()
        circulo.fill.fore_color.rgb = AMARELO
        circulo.line.fill.background()
        circulo.shadow.inherit = False
        texto(s, x + 0.22, 2.1, 0.5, 0.3, num, size=14, bold=True, cor=NAVY,
              align=PP_ALIGN.CENTER)
        texto(s, x + 0.22, 2.66, cw - 0.44, 0.32, papel, size=16, bold=True, cor=BRANCO)
        texto(s, x + 0.22, 3.0, cw - 0.44, 0.25, conta, size=9, bold=True, cor=AMARELO)
        retangulo(s, x + 0.22, 3.34, 0.5, 0.035, BORDA)
        paragrafos(s, x + 0.22, 3.5, cw - 0.44, 2.3, itens, size=10.5,
                   cor=MUTED, gap=7, marcador="—", marcador_cor=BORDA)
        if i < len(etapas) - 1:
            seta = s.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW, Inches(x + cw + 0.03), Inches(3.7),
                Inches(0.22), Inches(0.3),
            )
            seta.fill.solid()
            seta.fill.fore_color.rgb = AMARELO
            seta.line.fill.background()
            seta.shadow.inherit = False

    texto(s, MARGEM, 5.75, CONTEUDO, 0.4,
          "Cada perfil só enxerga a própria clínica e o próprio escopo.",
          size=13, bold=True, cor=BRANCO)
    texto(s, MARGEM, 6.12, CONTEUDO, 0.3,
          "A regra vale na tela e no servidor: filtrar a listagem não protege a escrita.",
          size=10.5, cor=MUTED)

    rodape(s, 4)
    notas(s, "2:00-3:00 | Jornada. Conte a historia uma vez: a recepcao agenda, o "
             "aluno atende, o supervisor homologa e a RT enxerga o todo. Mostre "
             "que os nomes das contas serao usados na demo.")


def slide_psicologia(prs):
    s = novo_slide(prs)
    cabecalho(s, "Psicologia", "O prontuário como linha do tempo")

    itens = [
        "Demanda, Sessão e Encerramento no mesmo registro (RN-002).",
        "Linha do tempo cronológica unifica tudo o que foi registrado.",
        "PDF A4 institucional com assinatura do estagiário e da supervisão.",
        "Seis consultórios SPA com checagem de conflito de horário.",
        "Ocorrências da recepção visíveis ao aluno e ao supervisor.",
    ]
    paragrafos(s, MARGEM, 1.85, 6.1, 3.6, itens, size=13, cor=TEXTO, gap=12, line=1.18)

    # painel da linha do tempo
    caixa(s, 7.15, 1.8, 5.45, 4.55, cor=CARD_ALT)
    texto(s, 7.45, 2.0, 4.8, 0.3, "LINHA DO TEMPO", size=9.5, bold=True, cor=AMARELO)
    retangulo(s, 7.62, 2.55, 0.035, 3.35, BORDA)

    nos = [
        ("Demanda", "Motivo, história e objetivos do acompanhamento."),
        ("Sessões", "Registro clínico por atendimento, em ordem cronológica."),
        ("Encerramento", "Síntese e desfecho com as seis opções oficiais."),
    ]
    for i, (titulo, desc) in enumerate(nos):
        y = 2.62 + i * 1.05
        ponto = s.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(7.5), Inches(y + 0.04), Inches(0.27), Inches(0.27)
        )
        ponto.fill.solid()
        ponto.fill.fore_color.rgb = AMARELO if i < 2 else VERDE
        ponto.line.color.rgb = BG
        ponto.line.width = Pt(2)
        ponto.shadow.inherit = False
        texto(s, 8.0, y, 4.2, 0.3, titulo, size=13, bold=True, cor=BRANCO)
        texto(s, 8.0, y + 0.34, 4.3, 0.55, desc, size=10.5, cor=MUTED, line=1.1)

    chip = caixa(s, 7.5, 5.72, 2.25, 0.38, cor=CARD, raio=0.5)
    chip.line.color.rgb = VERDE
    texto(s, 7.5, 5.8, 2.25, 0.25, "PDF COM ASSINATURAS", size=8.5, bold=True,
          cor=VERDE, align=PP_ALIGN.CENTER)

    rodape(s, 5)
    notas(s, "3:00-3:45 | Psicologia. Destaque a linha do tempo unica e o PDF. "
             "Nao entre em detalhe de schema. Na demo, esta tela e a estacao 2.")


def slide_odontologia(prs):
    s = novo_slide(prs)
    cabecalho(s, "Odontologia", "Ficha clínica completa, por domínio")

    itens = [
        "Anamnese adulto e infantil no padrão CLI-FOR-45 e odontopediatria.",
        "Odontograma e periograma interativos com índices gengivais.",
        "Radiografias persistidas como imagem ou PDF, com autoria.",
        "Ficha versionada: parecer, carimbo e homologação do supervisor.",
        "PDF A4 com cabeçalho institucional, registro e assinaturas da dupla.",
    ]
    paragrafos(s, MARGEM, 1.85, 5.9, 3.6, itens, size=13, cor=TEXTO, gap=12, line=1.18)

    caixa(s, 6.95, 1.8, 5.65, 4.55, cor=CARD_ALT)
    texto(s, 7.25, 2.0, 4.9, 0.3, "MAPA 2D  ·  EXEMPLO DE ARCADA", size=9.5,
          bold=True, cor=AMARELO)

    dentes = ["11", "12", "13", "14", "21", "22", "23", "24",
              "31", "32", "33", "34", "41", "42", "43", "44"]
    cw, ch, gx, gy = 1.18, 0.62, 0.12, 0.10
    for i, dente in enumerate(dentes):
        col, lin = i % 4, i // 4
        x = 7.25 + col * (cw + gx)
        y = 2.42 + lin * (ch + gy)
        d = caixa(s, x, y, cw, ch, cor=CARD, borda=BORDA, raio=0.14)
        texto(s, x, y + 0.14, cw, 0.3, dente, size=10.5, bold=True,
              cor=TEXTO, align=PP_ALIGN.CENTER)

    legendas = ["Odontograma", "Periograma", "Índices", "Radiografias"]
    for i, leg in enumerate(legendas):
        x = 7.25 + (i % 2) * 2.55
        y = 5.42 + (i // 2) * 0.48
        pilula = caixa(s, x, y, 2.35, 0.36, cor=CARD, raio=0.5)
        pilula.line.color.rgb = BORDA
        texto(s, x, y + 0.08, 2.35, 0.25, leg, size=9, bold=True,
              cor=TEXTO, align=PP_ALIGN.CENTER)

    rodape(s, 6)
    notas(s, "3:45-4:30 | Odontologia. O ponto e a ficha inteira virar documento "
             "versionado e auditavel, nao so um procedimento solto. A demo "
             "opcional mostra o odontograma em /ficha-odonto.")


def slide_governanca(prs):
    s = novo_slide(prs)
    cabecalho(s, "Governança", "Quem faz, quem aprova e o que fica registrado")

    colunas = [
        ("Homologação docente",
         ["Fila por supervisor e por RT", "Parecer obrigatório, sem texto vazio",
          "Devolução para ajuste com versão", "Leitura bloqueia edição indevida",
          "Histórico de versões preservado"]),
        ("RBAC escopado por curso",
         ["Cinco perfis: recepção a coordenação", "RT responde pela própria clínica",
          "Escrita validada pelo registro, não pela lista", "Paciente ambíguo tratado à parte",
          "Coordenação não gerencia RT"]),
        ("Segurança e rastro",
         ["Senha com bcrypt e sessão por JWT", "Recuperação por código de uso único",
          "Auditoria imutável de cada ação", "Desativar preserva cadastro e histórico",
          "Falha de SMTP responde 503, não finge envio"]),
    ]
    cw = 3.72
    for i, (titulo, itens) in enumerate(colunas):
        x = MARGEM + i * (cw + 0.34)
        caixa(s, x, 1.85, cw, 3.7)
        retangulo(s, x + 0.3, 2.1, 0.55, 0.045, AMARELO)
        texto(s, x + 0.3, 2.28, cw - 0.6, 0.6, titulo, size=16, bold=True, cor=BRANCO)
        paragrafos(s, x + 0.3, 3.0, cw - 0.55, 2.6, itens, size=11.5,
                   cor=MUTED, gap=9, marcador="•", marcador_cor=AMARELO)

    faixa = caixa(s, MARGEM, 6.1, CONTEUDO, 0.68, cor=CARD_ALT)
    retangulo(s, MARGEM, 6.1, 0.09, 0.68, AMARELO)
    texto(s, MARGEM + 0.32, 6.24, CONTEUDO - 0.6, 0.4,
          "O que a instituição precisa provar está no sistema, não na memória de quem estava lá.",
          size=13.5, bold=True, cor=BRANCO, anchor=MSO_ANCHOR.MIDDLE)

    rodape(s, 7)
    notas(s, "4:30-5:10 | Governanca. Amarre RF-004, RF-007 e RF-009. Diga que a "
             "auditoria e imutavel e que desativar conta nao apaga historia.")


def slide_arquitetura(prs):
    s = novo_slide(prs)
    cabecalho(s, "Arquitetura e qualidade", "Stack moderna, migrações versionadas e testes")

    blocos = [
        ("FRONTEND", "React 19 · TypeScript", "Vite 8 · Tailwind v4 · React Router 7"),
        ("API REST", "FastAPI · SQLModel", "JWT · RBAC · Pydantic"),
        ("BANCO", "PostgreSQL 16", "Alembic · migrações versionadas"),
    ]
    bw, bh = 3.35, 1.55
    for i, (kicker, titulo, tech) in enumerate(blocos):
        x = MARGEM + i * (bw + 0.9)
        caixa(s, x, 2.0, bw, bh)
        texto(s, x + 0.28, 2.18, bw - 0.5, 0.25, kicker, size=9, bold=True, cor=AMARELO)
        texto(s, x + 0.28, 2.5, bw - 0.5, 0.35, titulo, size=15, bold=True, cor=BRANCO)
        texto(s, x + 0.28, 2.95, bw - 0.5, 0.4, tech, size=10, cor=MUTED, line=1.1)
        if i < 2:
            seta = s.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW, Inches(x + bw + 0.2), Inches(2.62),
                Inches(0.5), Inches(0.28),
            )
            seta.fill.solid()
            seta.fill.fore_color.rgb = AMARELO
            seta.line.fill.background()
            seta.shadow.inherit = False

    texto(s, MARGEM, 4.0, CONTEUDO, 0.3, "QUALIDADE VERIFICADA", size=9.5,
          bold=True, cor=AMARELO)
    chips = [
        ("141 testes", "suíte passando"),
        ("build TS", "verde"),
        ("Alembic check", "limpo"),
        ("RBAC", "testado por clínica"),
        ("Seed", "demo pronta"),
    ]
    cw = 2.2
    for i, (titulo, desc) in enumerate(chips):
        x = MARGEM + i * (cw + 0.17)
        caixa(s, x, 4.4, cw, 0.92, cor=CARD_ALT)
        texto(s, x + 0.18, 4.55, cw - 0.3, 0.28, titulo, size=12, bold=True, cor=BRANCO)
        texto(s, x + 0.18, 4.87, cw - 0.3, 0.25, desc, size=9, cor=MUTED)

    texto(s, MARGEM, 5.75, CONTEUDO, 0.6,
          "O ambiente sobe com Docker, schema aplicado por migração e nenhum create_all escondido.",
          size=12.5, cor=MUTED, line=1.2)

    rodape(s, 8)
    notas(s, "5:10-5:50 | Arquitetura em 40 segundos. Cite a stack e os 141 testes. "
             "Se a apresentacao for de 5 minutos, pule este slide.")


def slide_demo(prs):
    s = novo_slide(prs)
    cabecalho(s, "Demonstração", "Demo ao vivo: cinco estações, quatro minutos")

    linhas = [
        ("REC-002", "/psi/recepcao", "Agenda, falta com motivo e ocorrências"),
        ("16032935", "/psi/prontuario", "Sessão, demanda, encerramento e PDF assinado"),
        ("DOC-8821", "/psi/supervisao", "Fila de homologação: aprovar ou devolver"),
        ("RT-002", "/psi/coordenacao", "Painel, indicadores e dossiê de custódia"),
        ("RT-001", "/ficha-odonto", "Odontograma, periograma e radiografia"),
    ]
    x0, y0 = MARGEM, 1.85
    w = CONTEUDO
    h_header, h_linha = 0.42, 0.72
    cab = retangulo(s, x0, y0, w, h_header, BORDA)
    texto(s, x0 + 0.22, y0 + 0.1, 1.7, 0.25, "CONTA", size=9, bold=True, cor=AMARELO)
    texto(s, x0 + 2.05, y0 + 0.1, 2.6, 0.25, "TELA", size=9, bold=True, cor=AMARELO)
    texto(s, x0 + 4.85, y0 + 0.1, w - 5.0, 0.25, "O QUE MOSTRAR", size=9, bold=True, cor=AMARELO)

    for i, (conta, tela, desc) in enumerate(linhas):
        y = y0 + h_header + i * h_linha
        cor = CARD if i % 2 == 0 else CARD_ALT
        retangulo(s, x0, y, w, h_linha, cor)
        retangulo(s, x0, y, 0.05, h_linha, AMARELO if i < 4 else BORDA)
        texto(s, x0 + 0.22, y + 0.2, 1.8, 0.3, conta, size=12, bold=True, cor=BRANCO,
              fonte="Consolas")
        texto(s, x0 + 2.05, y + 0.2, 2.7, 0.3, tela, size=11, cor=AMARELO,
              fonte="Consolas")
        texto(s, x0 + 4.85, y + 0.17, w - 5.05, 0.4, desc, size=11.5, cor=TEXTO,
              line=1.05)

    texto(s, MARGEM, 6.02, 6.4, 0.35,
          "Senha do seed: unicare123", size=12, bold=True, cor=AMARELO)
    texto(s, MARGEM, 6.36, CONTEUDO, 0.3,
          "Se o tempo apertar: estações 1, 2 e 4. A odontologia fica como prova de escopo.",
          size=10.5, cor=MUTED)

    rodape(s, 9)
    notas(s, "5:50-9:50 | Demo. Quatro minutos no relogio. Estacao 1: registrar "
             "falta com motivo. Estacao 2: abrir a linha do tempo e exportar o PDF. "
             "Estacao 3: homologar ou devolver. Estacao 4: painel da RT. "
             "Se algo falhar, nao conserte ao vivo: pule para a proxima estacao.")


def slide_fecho(prs):
    s = novo_slide(prs)
    cabecalho(s, "Fechamento", "Um MVP pronto para o piloto")

    texto(s, MARGEM, 1.8, 5.75, 0.3, "O QUE JÁ ESTÁ ENTREGUE", size=9.5, bold=True, cor=AMARELO)
    paragrafos(s, MARGEM, 2.18, 5.7, 3.3, [
        "Recepção, agenda e triagem nas duas clínicas.",
        "Prontuário de psicologia e ficha odontológica completos.",
        "Homologação docente com parecer e versionamento.",
        "Painel da RT, dossiê de custódia e auditoria imutável.",
    ], size=13, cor=TEXTO, gap=11, line=1.15)

    texto(s, 6.75, 1.8, 5.8, 0.3, "PRÓXIMOS PASSOS", size=9.5, bold=True, cor=AMARELO)
    paragrafos(s, 6.75, 2.18, 5.75, 3.3, [
        "Piloto com uma turma por clínica.",
        "SMTP institucional com OAuth2, se exigido.",
        "Notificações e relatórios consolidados.",
        "Acessibilidade e desempenho em escala.",
    ], size=13, cor=TEXTO, gap=11, line=1.15)

    retangulo(s, MARGEM, 4.5, 0.05, 0.55, AMARELO)
    texto(s, MARGEM + 0.22, 4.55, CONTEUDO - 0.3, 0.45,
          "2 clínicas integradas  ·  5 perfis RBAC  ·  9 requisitos cobertos  ·  141 testes automatizados",
          size=12.5, bold=True, cor=MUTED)

    faixa = caixa(s, MARGEM, 5.55, CONTEUDO, 1.15, cor=RGBColor(0x10, 0x2B, 0x46))
    retangulo(s, MARGEM, 5.55, 0.09, 1.15, AMARELO)
    s.shapes.add_picture(str(CREST), Inches(MARGEM + 0.32), Inches(5.78), height=Inches(0.68))
    texto(s, MARGEM + 1.2, 5.72, 8.4, 0.4,
          "UniCare — cuidado integrado, com rastro.",
          size=18, bold=True, cor=BRANCO)
    texto(s, MARGEM + 1.2, 6.1, 8.4, 0.3,
          "Obrigado. Perguntas?", size=12, cor=MUTED)

    rodape(s, 10)
    notas(s, "9:50-10:00 | Fechamento. Uma frase de impacto e abra para perguntas. "
             "Se sobrar tempo, ofereca a estacao 5 de odontologia.")


def main():
    prs = Presentation()
    prs.slide_width = Inches(LARG)
    prs.slide_height = Inches(ALT)

    slide_capa(prs)
    slide_problema(prs)
    slide_solucao(prs)
    slide_jornada(prs)
    slide_psicologia(prs)
    slide_odontologia(prs)
    slide_governanca(prs)
    slide_arquitetura(prs)
    slide_demo(prs)
    slide_fecho(prs)

    props = prs.core_properties
    props.title = "UniCare — MVP"
    props.subject = "Apresentação do MVP UniCare — UNINASSAU Aracaju"
    props.author = "Equipe UniCare"
    props.language = "pt-BR"

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    prs.save(SAIDA)
    print(f"Gerado: {SAIDA}")
    print(f"Slides: {len(prs.slides)}")


if __name__ == "__main__":
    main()
