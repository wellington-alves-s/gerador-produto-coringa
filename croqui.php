<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Debug - Imprimir valores recebidos
    error_log("Altura recebida: " . $_POST['altura']);
    error_log("Largura recebida: " . $_POST['largura']);

    // Receber os dados do formulário
    $tipo = htmlspecialchars($_POST['tipo']);
    $descricao = nl2br(htmlspecialchars($_POST['descricao']));

    // Processar os valores mantendo o formato brasileiro
    $altura = isset($_POST['altura']) && $_POST['altura'] !== '' && $_POST['altura'] !== '0,000' ? $_POST['altura'] : '0,000';
    $largura = isset($_POST['largura']) && $_POST['largura'] !== '' && $_POST['largura'] !== '0,000' ? $_POST['largura'] : '0,000';
    $profundidade = isset($_POST['profundidade']) && $_POST['profundidade'] !== '' && $_POST['profundidade'] !== '0,000' ? $_POST['profundidade'] : '0,000';
    $espessura_porta = isset($_POST['espessura_porta']) && $_POST['espessura_porta'] !== '' && $_POST['espessura_porta'] !== '0,000' ? $_POST['espessura_porta'] : '0,000';
    $espessura_batente = isset($_POST['espessura_batente']) && $_POST['espessura_batente'] !== '' && $_POST['espessura_batente'] !== '0,000' ? $_POST['espessura_batente'] : '0,000';
    $servicos = isset($_POST['servicos']) ? $_POST['servicos'] : [];

    // Informações adicionais
    $info_adicionais = isset($_POST['info_adicionais']) ? nl2br(htmlspecialchars($_POST['info_adicionais'])) : '';

    // Novos campos
    $unidade = htmlspecialchars($_POST['unidade']);
    $preco = isset($_POST['preco']) && $_POST['preco'] !== '' && $_POST['preco'] !== '0,00' ? $_POST['preco'] : '0,00';
    $quantidade = (int)$_POST['quantidade'];
    $montagem = htmlspecialchars($_POST['montagem']);
    $grupo_servico = htmlspecialchars($_POST['grupo_servico']);

    // Campos específicos para Porta
    $tipo_porta = isset($_POST['tipo_porta']) ? $_POST['tipo_porta'] : [];
    $modelo_friso = htmlspecialchars($_POST['modelo_friso'] ?? '');
    $padrao_madeira = htmlspecialchars($_POST['padrao_madeira'] ?? '');
    $tipo_porta_select = htmlspecialchars($_POST['tipo_porta_select'] ?? '');
    $medidas_guarnicao = htmlspecialchars($_POST['medidas_guarnicao'] ?? '');
    $lados = htmlspecialchars($_POST['lados'] ?? '');
    $tipo_abertura = htmlspecialchars($_POST['tipo_abertura'] ?? '');
    $lado_abertura = htmlspecialchars($_POST['lado_abertura'] ?? '');

    // Campos específicos para Esquadria
    $padrao_madeira_esquadria = htmlspecialchars($_POST['padrao_madeira_esquadria'] ?? '');
    $medidas_guarnicao_esquadria = isset($_POST['medidas_guarnicao_esquadria']) && $_POST['medidas_guarnicao_esquadria'] !== '' && $_POST['medidas_guarnicao_esquadria'] !== '0,000' ? $_POST['medidas_guarnicao_esquadria'] : '0,000';
    $lados_esquadria = htmlspecialchars($_POST['lados_esquadria'] ?? '');
    $tipo_abertura_esquadria = htmlspecialchars($_POST['tipo_abertura_esquadria'] ?? '');
    $lado_abertura_esquadria = htmlspecialchars($_POST['lado_abertura_esquadria'] ?? '');
    $tipo_palheta = htmlspecialchars($_POST['tipo_palheta'] ?? '');
    $acabamento_ferragem = htmlspecialchars($_POST['acabamento_ferragem'] ?? '');
    $vidros = isset($_POST['vidros']) ? $_POST['vidros'] : [];

    // Campos específicos para Kit de Correr
    $tipo_kit = htmlspecialchars($_POST['tipo_kit'] ?? '');
    $modelo_kit = htmlspecialchars($_POST['modelo_kit'] ?? '');

    // Lidar com o upload da imagem
    $imagemPath = '';
    if (!empty($_POST['imagem-selecionada'])) {
        // Se uma imagem foi selecionada da biblioteca
        $imagemPath = $_POST['imagem-selecionada'];
    } elseif (isset($_FILES['imagem']) && $_FILES['imagem']['error'] == 0) {
        // Se uma nova imagem foi enviada via upload
        $uploadDir = 'uploads/';
        // Criar diretório se não existir
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $nomeArquivo = basename($_FILES['imagem']['name']);
        $caminhoCompleto = $uploadDir . time() . '_' . $nomeArquivo;

        if (move_uploaded_file($_FILES['imagem']['tmp_name'], $caminhoCompleto)) {
            $imagemPath = $caminhoCompleto;
        }
    }
}
?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Encomenda Especial - <?= $tipo ?></title>
    <!-- Adicionar html2canvas -->
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <!-- Adicionar jsPDF -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }

        .croqui-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            border: 1px solid #8B0000;
            margin: 10px auto;
        }

        .header {
            background: #8B0000;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0;
            border-bottom: 1px solid #8B0000;
        }

        .header h1 {
            margin: 0;
            font-size: 18px;
        }

        .header .ano {
            font-size: 14px;
        }

        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            min-height: calc(100% - 50px);
        }

        .coluna-esquerda {
            padding: 10px;
            border-right: 2px solid #8B0000;
            font-size: 12px;
            position: relative;
            min-height: 800px;
        }

        .coluna-direita {
            padding: 10px;
            font-size: 12px;
            position: relative;
            min-height: 800px;
        }

        .info-cliente {
            border: 1px solid #8B0000;
            margin-bottom: 10px;
            padding: 8px;
        }

        .info-cliente p {
            margin: 3px 0;
            display: flex;
            gap: 8px;
            font-size: 12px;
            align-items: center;
        }

        .info-cliente p.linha-completa {
            gap: 4px;
        }

        .info-cliente .campo-escrita {
            flex: 1;
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            min-width: 50px;
            height: 15px;
        }

        .info-cliente .label {
            white-space: nowrap;
            border: none !important;
            flex: none;
        }

        .descricao-produto {
            margin-bottom: 10px;
            border: 1px solid #8B0000;
            padding: 8px;
        }

        .descricao-produto h2 {
            margin: 0 0 8px 0;
            font-size: 14px;
            text-transform: uppercase;
        }

        .descricao-produto p {
            margin: 3px 0;
            line-height: 1.3;
        }

        .especificacoes-tecnicas {
            margin-bottom: 10px;
            border: 1px solid #8B0000;
            padding: 8px;
            height: calc(100% - 450px);
            overflow-y: auto;
        }

        .especificacoes-tecnicas h2 {
            margin: 0 0 8px 0;
            font-size: 14px;
            text-transform: uppercase;
        }

        .especificacoes-tecnicas p {
            margin: 3px 0;
            line-height: 1.3;
        }

        .especificacoes-tecnicas ul {
            margin: 3px 0;
            line-height: 1.3;
        }

        .especificacoes-tecnicas li {
            margin: 2px 0;
            font-size: 12px;
        }

        .produto-info {
            margin-bottom: 10px;
            border: 1px solid #8B0000;
            padding: 10px;
        }

        .produto-info h2 {
            margin: 0 0 10px 0;
            font-size: 16px;
            text-transform: uppercase;
        }

        .produto-info p {
            margin: 5px 0;
            line-height: 1.4;
        }

        .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
        }

        .desenho-container {
            border: 1px solid #8B0000;
            padding: 8px;
            margin-bottom: 10px;
            height: calc(100% - 120px);
        }

        .desenho-header {
            background: #8B0000;
            color: white;
            padding: 4px 8px;
            text-align: center;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .grid-desenho {
            background-image: linear-gradient(#ccc 1px, transparent 1px),
                linear-gradient(90deg, #ccc 1px, transparent 1px);
            background-size: 20px 20px;
            width: 100%;
            height: calc(100% - 30px);
            position: relative;
            border: 1px solid #999;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            padding: 40px;
            box-sizing: border-box;
        }

        .grid-desenho img {
            max-width: calc(100% - 80px);
            max-height: calc(100% - 80px);
            object-fit: contain;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        .desenho-produto {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            border: 2px solid #333;
            background-color: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .desenho-produto.porta {
            border: 3px solid #444;
        }

        .desenho-produto.porta .batente {
            position: absolute;
            left: -8px;
            top: -8px;
            right: -8px;
            bottom: -8px;
            border: 8px solid #666;
            z-index: -1;
        }

        .desenho-produto.porta .divisao {
            position: absolute;
            background-color: #333;
        }

        .desenho-produto.porta .divisao-vertical {
            width: 2px;
            height: 100%;
            top: 0;
        }

        .desenho-produto.porta .divisao-horizontal {
            height: 2px;
            width: 100%;
            left: 0;
        }

        .desenho-produto.esquadria {
            border: 4px solid #666;
        }

        .desenho-produto.esquadria .palheta {
            position: absolute;
            left: 10%;
            width: 80%;
            height: 2px;
            background-color: #333;
        }

        .desenho-produto.batente {
            border: 12px solid #666;
        }

        .desenho-produto.guarnicao {
            border: 6px solid #666;
            border-radius: 4px;
        }

        .desenho-produto.degrau,
        .desenho-produto.patamar {
            border: none;
            background-color: transparent;
        }

        .desenho-produto.degrau .base,
        .desenho-produto.patamar .base {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 20%;
            background-color: #ddd;
            border-top: 2px solid #333;
        }

        .desenho-produto.rodape {
            height: 20%;
            background-color: #ddd;
            border: 2px solid #333;
        }

        .dimensoes {
            position: absolute;
            font-weight: bold;
            color: #333;
            background: rgba(255, 255, 255, 0.8);
            padding: 2px 12px;
            z-index: 2;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            font-size: 14px;
        }

        .largura {
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            letter-spacing: 1px;
        }

        .altura {
            right: 10px;
            top: 50%;
            transform: translateY(-50%) rotate(90deg);
            transform-origin: right;
            letter-spacing: 1px;
        }

        .fornecedor-info {
            position: absolute;
            bottom: 10px;
            left: 10px;
            right: 10px;
            border: 1px solid #8B0000;
            padding: 8px;
            height: 50px;
        }

        .fornecedor-info p {
            margin: 3px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .linha-escrita {
            flex: 1;
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            min-width: 200px;
            height: 18px;
        }

        .assinaturas {
            margin: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 11px;
            position: absolute;
            bottom: 60px;
            left: 0;
            right: 0;
        }

        .assinaturas-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .assinatura {
            text-align: center;
        }

        .assinatura-linha {
            border-top: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin-top: 20px;
            padding-top: 3px;
        }

        .data-assinatura {
            margin-top: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 5px;
            text-align: center;
        }

        .data-linha {
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 40px;
            height: 15px;
            display: inline-block;
        }

        .data-linha-ano {
            border-bottom: 1px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 60px;
            height: 15px;
            display: inline-block;
        }

        .data-separador {
            margin: 0 5px;
        }

        .aviso-cliente {
            background: #8B0000;
            color: white;
            padding: 6px;
            margin-bottom: 8px;
            font-size: 10px;
            position: absolute;
            bottom: 220px;
            left: 10px;
            right: 10px;
            text-align: center;
        }

        .aviso-cliente h3 {
            margin: 0;
            font-size: 11px;
            margin-bottom: 3px;
            text-align: center;
        }

        .aviso-cliente p {
            margin: 2px 0;
            font-size: 9px;
            line-height: 1.2;
            text-align: center;
        }

        .prazo {
            color: #8B0000;
            font-weight: bold;
            text-align: center;
            padding: 6px;
            border: 1px solid #8B0000;
            font-size: 10px;
            line-height: 1.2;
            position: absolute;
            bottom: 180px;
            left: 10px;
            right: 10px;
        }

        .uso-interno {
            background: #8B0000;
            color: white;
            padding: 5px 10px;
            margin-bottom: 10px;
            position: absolute;
            bottom: 70px;
            left: 10px;
            right: 10px;
        }

        .logo-madel {
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: 150px;
            height: auto;
        }

        .selo-madel {
            position: absolute;
            bottom: 2px;
            right: 10px;
            width: 120px;
            height: auto;
        }

        .acoes {
            margin: 10px;
            display: flex;
            gap: 10px;
            border-top: 1px solid #8B0000;
            padding-top: 10px;
        }

        .btn-acao {
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }

        .btn-acao:hover {
            background: #218838;
        }

        @media print {
            @page {
                size: A4 landscape;
                margin: 0;
            }

            body {
                background: white;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .croqui-container {
                box-shadow: none;
                margin: 0;
                border: 1px solid #8B0000;
                width: 100%;
                height: 100%;
                page-break-inside: avoid;
                overflow: hidden;
            }

            .content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0;
                height: calc(210mm - 80px);
                page-break-inside: avoid;
            }

            .coluna-esquerda,
            .coluna-direita {
                padding: 5px;
                min-height: auto;
                height: 100%;
                page-break-inside: avoid;
                font-size: 10px;
            }

            .info-cliente span {
                border-bottom: 1px solid #000000 !important;
            }

            .linha-escrita {
                border-bottom: 1px solid #000000 !important;
            }

            .assinatura-linha {
                border-top: 1px solid #000000 !important;
            }

            .data-linha,
            .data-linha-ano {
                border-bottom: 1px solid #000000 !important;
            }

            .header,
            .aviso-cliente,
            .uso-interno {
                background-color: #8B0000 !important;
                color: white !important;
            }

            .info-cliente,
            .descricao-produto,
            .especificacoes-tecnicas,
            .desenho-container,
            .fornecedor-info {
                border: 1px solid #8B0000 !important;
            }

            .coluna-esquerda {
                border-right: 2px solid #8B0000 !important;
            }

            .grid-desenho {
                border: 1px solid #999999 !important;
                background-image: linear-gradient(#cccccc 1px, transparent 1px),
                    linear-gradient(90deg, #cccccc 1px, transparent 1px) !important;
            }

            .acoes {
                display: none;
            }

            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>

<body>
    <div class="croqui-container">
        <div class="header">
            <h1>ENCOMENDA ESPECIAL <?= strtoupper($tipo) ?></h1>
        </div>

        <div class="content">
            <div class="coluna-esquerda">
                <div class="info-cliente">
                    <p>Cliente: <span class="campo-escrita"></span></p>
                    <p class="linha-completa">
                        <span class="label">Nº Pedido:</span><span class="campo-escrita"></span>
                        <span class="label">Data:</span><span class="campo-escrita"></span>
                        <span class="label">Vendedor:</span><span class="campo-escrita"></span>
                        <span class="label">Loja:</span><span class="campo-escrita"></span>
                    </p>
                </div>

                <div class="descricao-produto">
                    <h2>Descrição do Produto</h2>
                    <p><?= $descricao ?></p>
                </div>

                <div class="especificacoes-tecnicas">
                    <h2>Especificações Técnicas</h2>
                    <p>TIPO: <?= $tipo ?></p>
                    <p>ALTURA: <?= $altura ?> M X LARGURA: <?= $largura ?> M</p>
                    <?php if ($tipo === 'ESQUADRIA' && $espessura_batente !== '0,000'): ?>
                        <p>CAIXA DO BATENTE: <?= $espessura_batente ?> M</p>
                    <?php endif; ?>
                    <?php if ($tipo === 'PORTA' && $espessura_porta !== '0,000'): ?>
                        <p>ESPESSURA DA PORTA: <?= $espessura_porta ?> M</p>
                    <?php endif; ?>
                    <?php
                    // Mostra espessura do batente apenas se for PORTA sem SÓ FOLHA ou se for BATENTE
                    $mostraEspessuraBatente = ($tipo === 'BATENTE' && $espessura_batente !== '0,000') ||
                        ($tipo === 'PORTA' && !in_array('SÓ FOLHA', $tipo_porta) && $espessura_batente !== '0,000');
                    if ($mostraEspessuraBatente): ?>
                        <p>CAIXA DO BATENTE: <?= $espessura_batente ?> M</p>
                    <?php endif; ?>
                    <?php if (!empty($servicos)): ?>
                        <p>SERVIÇOS VINCULADOS:</p>
                        <ul style="list-style: none; padding-left: 10px; margin: 5px 0;">
                            <?php foreach ($servicos as $servico): ?>
                                <li>- <?= htmlspecialchars($servico) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>


                    <p>QUANTIDADE: <?= $quantidade ?></p>
                    <?php if ($tipo === 'PORTA'): ?>
                        <?php if (!empty($tipo_porta)): ?>
                            <p>TIPO: <?= implode(', ', $tipo_porta) ?></p>
                        <?php endif; ?>
                        <?php if (!empty($tipo_porta_select)): ?>
                            <p>TIPO DE PORTA: <?= $tipo_porta_select ?></p>
                        <?php endif; ?>
                        <?php if (!empty($modelo_friso)): ?>
                            <p>MODELO DE FRISO: <?= $modelo_friso ?></p>
                        <?php endif; ?>
                        <?php if (!empty($padrao_madeira)): ?>
                            <p>PADRÃO MADEIRA: <?= $padrao_madeira ?></p>
                        <?php endif; ?>
                        <?php if (!empty($medidas_guarnicao)): ?>
                            <p>MEDIDAS GUARNIÇÃO: <?= $medidas_guarnicao ?></p>
                        <?php endif; ?>
                        <?php if (!empty($lados)): ?>
                            <p>LADOS: <?= $lados ?></p>
                        <?php endif; ?>
                        <?php if (!empty($tipo_abertura)): ?>
                            <p>TIPO DE ABERTURA: <?= $tipo_abertura ?></p>
                        <?php endif; ?>
                        <?php if (!empty($lado_abertura)): ?>
                            <p>LADO DE ABERTURA: <?= $lado_abertura ?></p>
                        <?php endif; ?>
                    <?php endif; ?>
                    <?php if ($tipo === 'ESQUADRIA'): ?>
                        <?php if (!empty($padrao_madeira_esquadria)): ?>
                            <p>PADRÃO MADEIRA: <?= $padrao_madeira_esquadria ?></p>
                        <?php endif; ?>
                        <?php if (!empty($medidas_guarnicao_esquadria)): ?>
                            <p>MEDIDAS GUARNIÇÃO: <?= $medidas_guarnicao_esquadria ?> M</p>
                        <?php endif; ?>
                        <?php if (!empty($lados_esquadria)): ?>
                            <p>LADOS: <?= $lados_esquadria ?></p>
                        <?php endif; ?>
                        <?php if (!empty($tipo_abertura_esquadria)): ?>
                            <p>TIPO DE ABERTURA: <?= $tipo_abertura_esquadria ?></p>
                        <?php endif; ?>
                        <?php if (!empty($lado_abertura_esquadria)): ?>
                            <p>LADO DE ABERTURA: <?= $lado_abertura_esquadria ?></p>
                        <?php endif; ?>
                        <?php if (!empty($tipo_palheta)): ?>
                            <p>TIPO DE PALHETA: <?= $tipo_palheta ?></p>
                        <?php endif; ?>
                        <?php if (!empty($acabamento_ferragem)): ?>
                            <p>ACABAMENTO FERRAGEM: <?= $acabamento_ferragem ?></p>
                        <?php endif; ?>
                        <?php if (!empty($vidros)): ?>
                            <p>VIDROS: <?= implode(', ', array_map(function ($vidro) {
                                            switch ($vidro) {
                                                case 'CONSIDERAR_DESENHO':
                                                    return 'CONSIDERAR QUANTIDADE DE VIDROS DO DESENHO';
                                                case 'PROPORCIONAL':
                                                    return 'FAZER QUANTIDADE E TAMANHOS PROPORCIONAIS AS MEDIDAS DA PEÇA';
                                                case 'CRITERIO_FABRICA':
                                                    return 'QUANTIDADES E TAMANHOS A CRITÉRIO DA FABRICA';
                                                default:
                                                    return $vidro;
                                            }
                                        }, $vidros)) ?></p>
                        <?php endif; ?>
                    <?php endif; ?>
                    <?php if ($tipo === 'KIT DE CORRER'): ?>
                        <?php if (!empty($tipo_kit)): ?>
                            <p>TIPO KIT: <?= $tipo_kit ?></p>
                        <?php endif; ?>
                        <?php if (!empty($modelo_kit)): ?>
                            <p>MODELO: <?= $modelo_kit ?></p>
                        <?php endif; ?>
                    <?php endif; ?>
                    <?php if (!empty($info_adicionais)): ?>
                        <p>INFORMAÇÕES ADICIONAIS:</p>
                        <p style="margin-left: 10px; font-style: italic;"><?= $info_adicionais ?></p>
                    <?php endif; ?>
                </div>

                <div class="aviso-cliente">
                    <h3>AVISO AO CLIENTE</h3>
                    <p>*TODAS AS MEDIDAS E CARACTERÍSTICAS DEVERÃO SER DEVIDAMENTE CONFIRMADAS.</p>
                    <p>*NÃO SERÃO ACEITAS, TROCA OU ALTERAÇÃO DE PEÇAS ESPECIAIS.</p>
                    <p>*NÃO SERÁ ACEITO CANCELAMENTO, APÓS A APROVAÇÃO DESTE PROJETO.</p>
                </div>

                <div class="prazo">
                    *O PRAZO DE ENTREGA ENTRARÁ EM VIGOR APÓS O PROJETO ASSINADO E DATADO<br>
                    PRAZO DE CHEGADA DE MERCADORIA EM DEPÓSITO ATÉ 60 DIAS
                </div>

                <div class="assinaturas">
                    <div class="assinaturas-container">
                        <div class="assinatura">
                            <div class="assinatura-linha">ASSINATURA DO CLIENTE</div>
                        </div>
                        <div class="assinatura">
                            <div class="assinatura-linha">ASSINATURA DO GERENTE</div>
                        </div>
                    </div>
                    <div class="data-assinatura">
                        Data: <span class="data-linha"></span><span class="data-separador">/</span><span class="data-linha"></span><span class="data-separador">/</span><span class="data-linha-ano"></span>
                    </div>
                </div>

                <img src="madel-logo.png" alt="Logo Madel" class="logo-madel">
                <img src="madel-selo.png" alt="Selo Madel Sob Medida" class="selo-madel">
            </div>

            <div class="coluna-direita">
                <div class="desenho-container">
                    <div class="desenho-header">DESENHO DA PEÇA ESPECIAL</div>
                    <div class="grid-desenho" id="dimensionBox">
                        <div class="dimensoes largura">⟵ <?= $largura ?> M LARGURA ⟶</div>
                        <div class="dimensoes altura">⟵ <?= $altura ?> M ALTURA ⟶</div>
                        <?php if (!empty($imagemPath)): ?>
                            <img src="<?= $imagemPath ?>" alt="Imagem do Produto">
                        <?php endif; ?>
                    </div>
                </div>

                <div class="uso-interno">
                    USO INTERNO PARA COMPRAS
                </div>

                <div class="fornecedor-info">
                    <p>Fornecedor: <span class="linha-escrita"></span></p>
                    <p>Custo: <span class="linha-escrita"></span></p>
                </div>
            </div>
        </div>

        <div class="acoes">
            <button onclick="imprimirCroqui()" class="btn-acao">🖨️ Imprimir</button>
            <button onclick="baixarImagem()" class="btn-acao">⬇️ Baixar Imagem</button>
            <a href="index.html" class="btn-acao">← Voltar</a>
        </div>
    </div>

    <script>
        // Função para desenhar o croqui
        function desenharCroqui() {
            const box = document.getElementById('dimensionBox');
            if (!box) return;

            // Criar SVG para o desenho da porta/esquadria apenas se não houver imagem
            <?php if (empty($imagemPath)): ?>
                const desenho = document.createElement('div');
                desenho.className = 'desenho-produto <?= strtolower($tipo) ?>';

                // Adicionar detalhes específicos baseado no tipo
                switch ('<?= $tipo ?>') {
                    case 'PORTA':
                        // Adicionar batente se não for SÓ FOLHA
                        <?php if (!in_array('SÓ FOLHA', $tipo_porta ?? [])): ?>
                            const batente = document.createElement('div');
                            batente.className = 'batente';
                            desenho.appendChild(batente);
                        <?php endif; ?>

                        // Adicionar detalhes da porta baseado no tipo_porta_select
                        <?php if (!empty($tipo_porta_select)): ?>
                            switch ('<?= $tipo_porta_select ?>') {
                                case 'ALMOFADA':
                                    // Criar almofadas
                                    for (let i = 0; i < 2; i++) {
                                        for (let j = 0; j < 3; j++) {
                                            const almofada = document.createElement('div');
                                            almofada.className = 'divisao';
                                            almofada.style.left = `${33.33 * i}%`;
                                            almofada.style.top = `${33.33 * j}%`;
                                            almofada.style.width = '30%';
                                            almofada.style.height = '30%';
                                            almofada.style.border = '2px solid #333';
                                            almofada.style.borderRadius = '8px';
                                            desenho.appendChild(almofada);
                                        }
                                    }
                                    break;
                                case 'MEXICANA':
                                    // Adicionar divisões horizontais
                                    for (let i = 1; i < 3; i++) {
                                        const divisaoH = document.createElement('div');
                                        divisaoH.className = 'divisao divisao-horizontal';
                                        divisaoH.style.top = `${i * 33.33}%`;
                                        desenho.appendChild(divisaoH);
                                    }
                                    // Adicionar divisão vertical
                                    const divisaoV = document.createElement('div');
                                    divisaoV.className = 'divisao divisao-vertical';
                                    divisaoV.style.left = '50%';
                                    desenho.appendChild(divisaoV);
                                    break;
                            }
                        <?php endif; ?>
                        break;

                    case 'ESQUADRIA':
                        // Adicionar palhetas se especificado
                        <?php if (!empty($tipo_palheta)): ?>
                            const numPalhetas = 5;
                            for (let i = 1; i < numPalhetas; i++) {
                                const palheta = document.createElement('div');
                                palheta.className = 'palheta';
                                palheta.style.top = `${i * (80/numPalhetas) + 10}%`;
                                desenho.appendChild(palheta);
                            }
                        <?php endif; ?>
                        break;

                    case 'DEGRAU':
                    case 'PATAMAR':
                        const base = document.createElement('div');
                        base.className = 'base';
                        desenho.appendChild(base);
                        break;
                }

                box.appendChild(desenho);
            <?php endif; ?>
        }

        // Função para imprimir
        function imprimirCroqui() {
            const croquiContainer = document.querySelector('.croqui-container');

            // Remover temporariamente os botões de ação
            const botoesAcao = document.querySelector('.acoes');
            const botoesDisplay = botoesAcao.style.display;
            botoesAcao.style.display = 'none';

            html2canvas(croquiContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 1200,
                height: croquiContainer.scrollHeight
            }).then(function(canvas) {
                // Restaurar botões
                botoesAcao.style.display = botoesDisplay;

                // Criar PDF usando jsPDF
                const {
                    jsPDF
                } = window.jspdf;
                const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' para landscape

                const imgData = canvas.toDataURL('image/png', 1.0);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                // Adicionar a imagem ao PDF mantendo a proporção
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const imgX = (pdfWidth - imgWidth * ratio) / 2;
                const imgY = (pdfHeight - imgHeight * ratio) / 2;

                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

                // Salvar o PDF
                pdf.save('encomenda-especial-<?= strtolower($tipo) ?>-<?= date('Y-m-d-His') ?>.pdf');
            }).catch(function(error) {
                console.error('Erro ao gerar o PDF:', error);
                botoesAcao.style.display = botoesDisplay;
                alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
            });
        }

        // Função para baixar imagem
        function baixarImagem() {
            const croquiContainer = document.querySelector('.croqui-container');

            // Remover temporariamente os botões
            const botoesAcao = document.querySelector('.acoes');
            const botoesDisplay = botoesAcao.style.display;
            botoesAcao.style.display = 'none';

            html2canvas(croquiContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 1200,
                height: croquiContainer.scrollHeight
            }).then(function(canvas) {
                // Restaurar botões
                botoesAcao.style.display = botoesDisplay;

                // Criar e disparar o download
                const link = document.createElement('a');
                link.download = 'encomenda-especial-<?= strtolower($tipo) ?>-<?= date('Y-m-d-His') ?>.png';
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
            }).catch(function(error) {
                console.error('Erro ao gerar a imagem:', error);
                botoesAcao.style.display = botoesDisplay;
            });
        }

        // Desenhar o croqui quando a página carregar
        window.addEventListener('load', desenharCroqui);
        // Redesenhar quando a janela for redimensionada
        window.addEventListener('resize', desenharCroqui);
    </script>
</body>

</html>