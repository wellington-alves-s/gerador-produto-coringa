<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Dados do formulário
    $descricao = $_POST['descricao'];
    $altura = $_POST['altura'];
    $largura = $_POST['largura'];
    $espessura = $_POST['espessura'];
    $unidade = $_POST['unidade'];
    $quantidade = $_POST['quantidade'];
    $valor = $_POST['valor'];
    $servico = $_POST['servico'];
    $assinatura = $_POST['assinatura'];
    $data = date('Y-m-d');

    // Upload da imagem
    if (isset($_FILES['imagem']) && $_FILES['imagem']['error'] == 0) {
        $nomeImagem = uniqid() . '_' . $_FILES['imagem']['name'];
        $destino = 'uploads/' . $nomeImagem;
        move_uploaded_file($_FILES['imagem']['tmp_name'], $destino);
    } else {
        $nomeImagem = 'placeholder.jpg';  // imagem padrão caso não envie
    }

    // Passar os dados via SESSION
    session_start();
    $_SESSION['dados'] = [
        'descricao' => $descricao,
        'altura' => $altura,
        'largura' => $largura,
        'espessura' => $espessura,
        'unidade' => $unidade,
        'quantidade' => $quantidade,
        'valor' => $valor,
        'servico' => $servico,
        'assinatura' => $assinatura,
        'data' => $data,
        'imagem' => $destino
    ];

    // Redireciona para o croqui
    header('Location: croqui.php');
    exit();
}
?>
