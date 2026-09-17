<?php
// Diretório onde as imagens estão armazenadas
$dir = 'uploads/';
$search = isset($_GET['search']) ? strtolower($_GET['search']) : '';

// Array para armazenar as imagens
$images = [];

// Verifica se o diretório existe
if (is_dir($dir)) {
    // Abre o diretório
    if ($handle = opendir($dir)) {
        // Lê cada arquivo do diretório
        while (($file = readdir($handle)) !== false) {
            if ($file != "." && $file != "..") {
                // Verifica se é uma imagem
                $fileInfo = pathinfo($file);
                $extension = strtolower($fileInfo['extension'] ?? '');
                if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
                    // Se houver termo de busca, verifica se o nome do arquivo contém o termo
                    if (empty($search) || strpos(strtolower($file), $search) !== false) {
                        $images[] = [
                            'name' => $file,
                            'path' => $dir . $file,
                            'date' => filemtime($dir . $file)
                        ];
                    }
                }
            }
        }
        closedir($handle);
    }
}

// Ordena as imagens por data (mais recentes primeiro)
usort($images, function ($a, $b) {
    return $b['date'] - $a['date'];
});

// Retorna JSON se for uma requisição AJAX
if (
    !empty($_SERVER['HTTP_X_REQUESTED_WITH']) &&
    strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest'
) {
    header('Content-Type: application/json');
    echo json_encode($images);
    exit;
}
?>

<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Biblioteca de Imagens</title>
    <style>
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 50px;
            padding: 45px;
            margin: 0 auto;
            max-width: 1400px;
        }

        .image-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            min-height: 280px;
            display: flex;
            flex-direction: column;
            width: 100%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .image-item:hover {
            border-color: #8B0000;
            transform: scale(1.05);
        }

        .image-item img {
            width: 100%;
            height: 230px;
            object-fit: contain;
            border-radius: 2px;
            margin-bottom: 10px;
            background-color: #f5f5f5;
            padding: 5px;
        }

        .image-name {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            padding: 0 5px;
            line-height: 1.2;
            word-wrap: break-word;
            height: auto;
            min-height: 30px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .search-bar {
            padding: 15px;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .search-input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .no-images {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>

<body>
    <div class="search-bar">
        <input type="text" class="search-input" placeholder="Pesquisar imagens..." onkeyup="searchImages(this.value)">
    </div>
    <div class="image-grid">
        <?php if (empty($images)): ?>
            <div class="no-images">Nenhuma imagem encontrada</div>
        <?php else: ?>
            <?php foreach ($images as $image): ?>
                <div class="image-item" onclick="selectImage('<?= htmlspecialchars($image['path']) ?>')">
                    <img src="<?= htmlspecialchars($image['path']) ?>" alt="<?= htmlspecialchars($image['name']) ?>">
                    <div class="image-name"><?= htmlspecialchars($image['name']) ?></div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <script>
        function searchImages(query) {
            fetch(`biblioteca_imagens.php?search=${encodeURIComponent(query)}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(images => {
                    const grid = document.querySelector('.image-grid');
                    if (images.length === 0) {
                        grid.innerHTML = '<div class="no-images">Nenhuma imagem encontrada</div>';
                        return;
                    }

                    grid.innerHTML = images.map(image => `
                    <div class="image-item" onclick="selectImage('${image.path}')">
                        <img src="${image.path}" alt="${image.name}">
                        <div class="image-name">${image.name}</div>
                    </div>
                `).join('');
                });
        }

        function selectImage(path) {
            if (window.opener && !window.opener.closed) {
                window.opener.document.getElementById('imagem').value = '';
                window.opener.document.getElementById('imagem-selecionada').value = path;
                window.opener.document.getElementById('preview-imagem').src = path;
                window.opener.document.getElementById('preview-container').style.display = 'block';
                window.close();
            }
        }
    </script>
</body>

</html>