document.addEventListener("DOMContentLoaded", function () {
	const tipoSelect = document.getElementById("tipo");
	const campos = {
		profundidade: document.querySelector(".campo.profundidade"),
		espessura_porta: document.querySelector(".campo.espessura_porta"),
		espessura_batente: document.querySelector(".campo.espessura_batente"),
		campos_porta: document.querySelector(".campos-porta"),
		campos_esquadria: document.querySelector(".campos-esquadria"),
		campos_kit_correr: document.querySelector(".campos-kit-correr"),
		medidas_guarnicao: document
			.querySelector('input[name="medidas_guarnicao"]')
			.closest(".campo"),
		lados: document.querySelector(".campo.lados"),
		tipo_abertura: document.querySelector('select[name="tipo_abertura"]').closest(".campo"),
		lado_abertura: document.querySelector('input[name="lado_abertura"]').closest(".campo"),
		montagem: document.querySelector(".campo.montagem"),
		grupo_servico: document.querySelector(".campo.grupo_servico"),
		largura: document.querySelector(".campo.largura"),
		altura: document.querySelector(".campo.altura"),
		tipo_kit_correr: null,
		modelo_kit_correr: null,
	};
	const checkboxSoFolha = document.querySelector('input[value="SÓ FOLHA"]');
	const checkboxConjunto = document.querySelector('input[value="CONJUNTO"]');
	const inputEspessuraBatente = document.getElementById("espessura_batente");
	const inputEspessuraPorta = document.getElementById("espessura_porta");
	const inputAltura = document.getElementById("altura");
	const inputLargura = document.getElementById("largura");
	const inputProfundidade = document.getElementById("profundidade");
	const inputMedidasGuarnicaoEsquadria = document.getElementById("medidas_guarnicao_esquadria");
	const inputPreco = document.getElementById("preco");
	const checkboxesVidros = document.querySelectorAll('input[name="vidros[]"]');
	const form = document.querySelector("form");

	// Esconde os campos específicos inicialmente
	campos.medidas_guarnicao.style.display = "none";
	campos.lados.style.display = "none";
	campos.tipo_abertura.style.display = "none";
	campos.lado_abertura.style.display = "none";
	campos.campos_esquadria.style.display = "none";
	campos.campos_porta.style.display = "none";
	campos.montagem.style.display = "block";
	campos.grupo_servico.style.display = "block";

	// Adiciona lógica de exclusão mútua entre SÓ FOLHA e CONJUNTO
	checkboxSoFolha.addEventListener("change", function () {
		if (this.checked) {
			checkboxConjunto.checked = false;
			campos.espessura_batente.style.display = "none";
			inputEspessuraBatente.value = "0,000";
			// Esconde os campos específicos quando SÓ FOLHA é selecionado
			campos.medidas_guarnicao.style.display = "none";
			campos.lados.style.display = "none";
			campos.tipo_abertura.style.display = "none";
			campos.lado_abertura.style.display = "none";
			campos.montagem.style.display = "none";
			campos.grupo_servico.style.display = "none";
		} else if (tipoSelect.value === "PORTA") {
			campos.espessura_batente.style.display = "block";
		}
		atualizarCampoObrigatorio();
	});

	checkboxConjunto.addEventListener("change", function () {
		if (this.checked) {
			checkboxSoFolha.checked = false;
			campos.espessura_batente.style.display = "block";
			// Mostra os campos específicos quando CONJUNTO é selecionado
			campos.medidas_guarnicao.style.display = "block";
			campos.lados.style.display = "block";
			campos.tipo_abertura.style.display = "block";
			campos.lado_abertura.style.display = "block";
			campos.montagem.style.display = "block";
			campos.grupo_servico.style.display = "block";
		} else {
			// Esconde os campos específicos quando CONJUNTO é desmarcado
			campos.medidas_guarnicao.style.display = "none";
			campos.lados.style.display = "none";
			campos.tipo_abertura.style.display = "none";
			campos.lado_abertura.style.display = "none";
			campos.montagem.style.display = "none";
			campos.grupo_servico.style.display = "none";
		}
		atualizarCampoObrigatorio();
	});

	// Adiciona lógica de exclusão mútua entre os checkboxes de vidros
	checkboxesVidros.forEach((checkbox) => {
		checkbox.addEventListener("change", function () {
			if (this.checked) {
				checkboxesVidros.forEach((cb) => {
					if (cb !== this) cb.checked = false;
				});
			}
		});
	});

	// Adiciona validação personalizada para os campos de medidas
	const adicionarValidacao = (input, mensagem) => {
		input.addEventListener("input", function () {
			const valor = parseFloat(this.value);
			const max = parseFloat(this.getAttribute("max"));

			if (valor > max) {
				this.setCustomValidity(`O valor máximo permitido é ${max} metros`);
			} else if (valor < 0) {
				this.setCustomValidity("O valor não pode ser negativo");
			} else {
				this.setCustomValidity("");
			}
		});
	};

	// Aplica validação para os campos
	adicionarValidacao(inputEspessuraPorta, "espessura da porta");
	adicionarValidacao(inputEspessuraBatente, "caixa do batente");
	adicionarValidacao(inputAltura, "altura");
	adicionarValidacao(inputLargura, "largura");

	// Função para formatar número no padrão brasileiro
	function formatarNumero(input) {
		let valorAnterior = "";
		let ultimoValorValido = "0000";

		input.addEventListener("input", function (e) {
			// Remove tudo que não for número
			let valor = e.target.value.replace(/\D/g, "");

			// Se não tiver valor, retorna 0,000
			if (!valor) {
				valorAnterior = "";
				ultimoValorValido = "0000";
				e.target.value = "0,000";
				return;
			}

			// Detecta se está apagando (backspace) ou digitando
			const estaApagando = valor.length < ultimoValorValido.length;

			if (estaApagando) {
				// Remove o último dígito do valor anterior
				ultimoValorValido = ultimoValorValido.slice(0, -1).padStart(4, "0");
			} else {
				// Adiciona o novo dígito
				const novoDigito = valor.slice(-1);
				ultimoValorValido = (ultimoValorValido + novoDigito).slice(-4);
			}

			// Formata o número
			e.target.value = ultimoValorValido.slice(0, -3) + "," + ultimoValorValido.slice(-3);
		});

		// Inicializa o campo com 0,000
		if (!input.value || input.value === "0,000") {
			input.value = "0,000";
		}
	}

	// Função para formatar preço no padrão brasileiro
	function formatarPreco(input) {
		let valorDigitado = "";

		input.addEventListener("keydown", function (e) {
			// Se pressionou backspace e o valor já está zerado, permite a exclusão
			if (e.key === "Backspace" && (valorDigitado === "" || valorDigitado === "0")) {
				valorDigitado = "";
				e.target.value = "0,00";
			}
		});

		input.addEventListener("input", function (e) {
			// Remove tudo que não for número
			const numero = e.target.value.replace(/\D/g, "");

			// Se não tem número, reinicia
			if (!numero) {
				valorDigitado = "";
				e.target.value = "0,00";
				return;
			}

			// Se está apagando (backspace)
			if (numero.length < valorDigitado.length || e.inputType === "deleteContentBackward") {
				valorDigitado = valorDigitado.slice(0, -1);
				if (!valorDigitado) {
					valorDigitado = "";
					e.target.value = "0,00";
					return;
				}
			} else {
				// Pega apenas o último número digitado
				const ultimoNumero = numero.slice(-1);
				valorDigitado += ultimoNumero;
			}

			// Formata o número
			const centavos = valorDigitado.slice(-2).padStart(2, "0");
			let reais = valorDigitado.slice(0, -2) || "0";

			// Adiciona os pontos dos milhares
			if (reais.length > 3) {
				reais = reais.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
			}

			// Atualiza o campo
			e.target.value = `${reais},${centavos}`;
		});

		// Inicializa com 0,00
		if (!input.value) {
			input.value = "0,00";
		}
	}

	// Adiciona validação para não permitir envio com valores zerados
	form.addEventListener("submit", function (e) {
		const tipoSelecionado = tipoSelect.value;
		let camposObrigatorios = [inputAltura, inputLargura];

		if (tipoSelecionado === "ESQUADRIA") {
			camposObrigatorios.push(inputEspessuraBatente);
		}

		for (let campo of camposObrigatorios) {
			if (campo.value === "0,000") {
				e.preventDefault();
				alert(
					"Por favor, preencha todos os campos de medidas com valores maiores que zero."
				);
				campo.focus();
				return;
			}
		}
	});

	// Aplica formatação para todos os campos numéricos
	formatarNumero(inputAltura);
	formatarNumero(inputLargura);
	formatarNumero(inputProfundidade);
	formatarNumero(inputEspessuraPorta);
	formatarNumero(inputEspessuraBatente);
	formatarNumero(inputMedidasGuarnicaoEsquadria);
	formatarPreco(inputPreco);

	function atualizarCamposVisiveis() {
		const tipoSelecionado = tipoSelect.value;
		const labelProfundidade = campos.profundidade.querySelector("label");
		const labelLargura = campos.largura.querySelector("label");
		const labelAltura = campos.altura.querySelector("label");

		// Esconde todos os campos opcionais primeiro
		campos.profundidade.style.display = "none";
		campos.espessura_porta.style.display = "none";
		campos.espessura_batente.style.display = "none";
		campos.campos_porta.style.display = "none";
		campos.campos_esquadria.style.display = "none";
		campos.campos_kit_correr.style.display = "none";
		campos.montagem.style.display = "block";
		campos.grupo_servico.style.display = "block";

		// Esconder campos específicos do Kit de Correr
		if (campos.tipo_kit_correr) {
			campos.tipo_kit_correr.style.display = "none";
			campos.modelo_kit_correr.style.display = "none";
		}

		// Reseta os labels para o padrão
		labelProfundidade.textContent = "Profundidade (m):";
		labelLargura.textContent = "Largura (m):";
		labelAltura.textContent = "Altura (m):";

		// Mostra campos relevantes baseado no tipo
		switch (tipoSelecionado) {
			case "PORTA":
				campos.espessura_porta.style.display = "block";
				if (!checkboxSoFolha.checked) {
					campos.espessura_batente.style.display = "block";
				}
				campos.campos_porta.style.display = "block";
				campos.grupo_servico.style.display = "none";
				break;
			case "ESQUADRIA":
				campos.espessura_batente.style.display = "block";
				campos.campos_esquadria.style.display = "block";
				campos.montagem.style.display = "none";
				campos.grupo_servico.style.display = "none";
				break;
			case "BATENTE":
				campos.profundidade.style.display = "block";
				campos.espessura_batente.style.display = "block";
				// Altera os labels específicos para Batente
				labelProfundidade.textContent = "Espessura do Batente (m):";
				labelLargura.textContent = "Comprimento Cabeceira (m):";
				campos.grupo_servico.style.display = "none";
				break;
			case "GUARNIÇÃO":
				campos.profundidade.style.display = "block";
				campos.grupo_servico.style.display = "none";
				// Altera os labels específicos para Guarnição
				labelProfundidade.textContent = "Espessura (m):";
				labelLargura.textContent = "Comprimento Cabeceira (m):";
				break;
			case "DEGRAU":
			case "PATAMAR":
			case "RODAPÉ":
				campos.profundidade.style.display = "block";
				// Altera os labels específicos para Degrau, Patamar e Rodapé
				labelProfundidade.textContent = "Espessura (m):";
				labelAltura.textContent = "Comprimento (m):";
				campos.montagem.style.display = "none"; // Esconde montagem
				break;
			case "FECHADURA":
				campos.profundidade.style.display = "block";
				campos.grupo_servico.style.display = "none"; // Esconde grupo de serviço para fechadura
				break;
			case "PUXADOR":
				campos.profundidade.style.display = "block";
				campos.grupo_servico.style.display = "none"; // Esconde grupo de serviço para puxador
				break;
			case "KIT DE CORRER":
				campos.profundidade.style.display = "block";
				campos.campos_kit_correr.style.display = "block";
				campos.grupo_servico.style.display = "none";
				labelProfundidade.textContent = "Caixa Batente (m):";
				labelLargura.textContent = "Comprimento Cabeceira (m):";
				if (campos.tipo_kit_correr) {
					campos.tipo_kit_correr.style.display = "block";
					campos.modelo_kit_correr.style.display = "block";
				}
				break;
			case "Outro":
				campos.profundidade.style.display = "block";
				break;
		}

		// Atualiza o required do campo caixa do batente
		atualizarCampoObrigatorio();
	}

	function atualizarCampoObrigatorio() {
		if (checkboxConjunto && checkboxConjunto.checked) {
			inputEspessuraBatente.required = true;
			inputEspessuraBatente.parentElement.querySelector("label").innerHTML =
				'Caixa do Batente (m): <span style="color: red;">*</span>';
		} else {
			inputEspessuraBatente.required = false;
			inputEspessuraBatente.parentElement.querySelector("label").innerHTML =
				"Caixa do Batente (m):";
		}
	}

	// Atualiza campos quando o tipo é alterado
	tipoSelect.addEventListener("change", atualizarCamposVisiveis);

	// Atualiza campos na inicialização
	atualizarCamposVisiveis();

	// Gerenciamento de imagem
	const inputImagem = document.getElementById("imagem");
	const previewImagem = document.getElementById("preview");
	const btnLimparImagem = document.getElementById("limpar-imagem");

	function limparImagem() {
		inputImagem.value = "";
		previewImagem.src = "#";
		previewImagem.style.display = "none";
		btnLimparImagem.style.display = "none";
	}

	inputImagem.addEventListener("change", function () {
		if (this.files && this.files[0]) {
			const reader = new FileReader();
			reader.onload = function (e) {
				previewImagem.src = e.target.result;
				previewImagem.style.display = "block";
				btnLimparImagem.style.display = "inline-block";
			};
			reader.readAsDataURL(this.files[0]);
		} else {
			limparImagem();
		}
	});

	btnLimparImagem.addEventListener("click", limparImagem);

	// Adicionar estilos CSS dinamicamente
	const style = document.createElement("style");
	style.textContent = `
		.imagem-container {
			display: flex;
			align-items: center;
			gap: 10px;
		}
		#limpar-imagem {
			background: none;
			border: none;
			cursor: pointer;
			padding: 5px;
			font-size: 16px;
		}
		#limpar-imagem:hover {
			opacity: 0.7;
		}
		.preview-container {
			margin-top: 10px;
		}
	`;
	document.head.appendChild(style);

	// Criar os novos campos de seleção para Kit de Correr
	const criarCampoKitCorrer = () => {
		// Criar campo Tipo
		const divTipo = document.createElement("div");
		divTipo.className = "campo kit_correr_tipo";
		divTipo.innerHTML = `
			<label for="kit_correr_tipo">Tipo:</label>
			<select name="kit_correr_tipo" id="kit_correr_tipo" class="kit_correr_campo">
				<option value="MADEIRA">MADEIRA</option>
				<option value="ALUMINIO">ALUMINIO</option>
				<option value="INOX">INOX</option>
			</select>
		`;

		// Criar campo Modelo
		const divModelo = document.createElement("div");
		divModelo.className = "campo kit_correr_modelo";
		divModelo.innerHTML = `
			<label for="kit_correr_modelo">Modelo:</label>
			<select name="kit_correr_modelo" id="kit_correr_modelo" class="kit_correr_campo">
				<option value="EMBUTIR">EMBUTIR</option>
				<option value="APARENTE">APARENTE</option>
				<option value="COM BATENTE">COM BATENTE</option>
				<option value="SEM BATENTE">SEM BATENTE</option>
			</select>
		`;

		// Inserir os campos após o campo de profundidade (Caixa Batente)
		const campoProfundidade = campos.profundidade;
		campoProfundidade.parentNode.insertBefore(divTipo, campoProfundidade.nextSibling);
		campoProfundidade.parentNode.insertBefore(divModelo, divTipo.nextSibling);

		// Atualizar as referências nos campos
		campos.tipo_kit_correr = divTipo;
		campos.modelo_kit_correr = divModelo;

		// Esconder inicialmente
		divTipo.style.display = "none";
		divModelo.style.display = "none";
	};

	// Chamar a função para criar os campos
	criarCampoKitCorrer();
});
